"""
IngestionPipeline — orchestre les étapes d'ingestion :

  1. Parse le fichier (selon son type)
  2. Extrait entités + mots-clés (SpaCy + KeyBERT)
  3. Génère les embeddings (sentence-transformers)
  4. Envoie au Graph Service (Neo4j)
  5. Indexe dans Qdrant (recherche sémantique)
  6. Met à jour le statut du job
"""
import asyncio
import logging
from app.core.file_router import FileRouter
from app.core.extractors.entity_extractor import EntityExtractor
from app.core.extractors.embedder import Embedder
from app.models.schemas import ExtractedDocument

logger = logging.getLogger(__name__)


class IngestionPipeline:

    def __init__(self):
        self.file_router = FileRouter()
        self.entity_extractor = EntityExtractor()
        self.embedder = Embedder()

    async def run(
        self,
        file_path: str,
        job_id: str,
        file_name: str,
        on_progress=None,       # callback(progress: int)
    ) -> ExtractedDocument:
        """
        Exécute le pipeline complet.
        Appelle on_progress(0..100) à chaque étape.
        """

        async def progress(pct: int, msg: str):
            logger.info(f"[{job_id}] {pct}% — {msg}")
            if on_progress:
                await on_progress(pct)

        # ── Étape 1 : Parsing ─────────────────────────────────────────────────
        await progress(10, "Parsing file...")
        # Run sync parsers in thread pool so they don't block the event loop
        parse_result = await asyncio.to_thread(self.file_router.parse, file_path)
        file_type = self.file_router.detect_file_type(file_path)

        # ── Étape 2 : Extraction entités + keywords ───────────────────────────
        await progress(30, "Extracting entities...")

        # If the parser already produced structured CIM entities, use them directly
        cim_records = (parse_result.extra or {}).get("cim_entities") if parse_result.extra else None
        if cim_records:
            from app.models.schemas import ExtractedEntity as SchemaEntity
            entities = [
                SchemaEntity(
                    name=rec["name"],
                    type=rec["cim_type"],
                    confidence=1.0,
                    source_page=None,
                    embedding=None,
                )
                for rec in cim_records
            ]
            keywords = list({rec["cim_type"] for rec in cim_records})
        else:
            # Run blocking NER + keyword extraction in thread pool
            entities, keywords = await asyncio.to_thread(
                self.entity_extractor.extract, parse_result.text
            )

        # ── Étape 3 : Embeddings des entités ──────────────────────────────────
        await progress(55, "Generating embeddings...")
        if entities:
            names = [e.name for e in entities]
            # Run blocking embedding in thread pool
            embeddings = await asyncio.to_thread(self.embedder.embed_batch, names)
            for entity, emb in zip(entities, embeddings):
                entity.embedding = emb

        # ── Étape 4 : Découpage du document en chunks pour Qdrant ─────────────
        await progress(70, "Chunking document for vector store...")
        # Run blocking chunk embedding in thread pool
        chunks = await asyncio.to_thread(self.embedder.embed_chunks, parse_result.text)

        # ── Étape 5 : Construction du document extrait ────────────────────────
        await progress(85, "Building knowledge graph data...")

        # Build CIM relations from rdf:resource references
        relations = []
        if cim_records:
            from app.models.schemas import ExtractedRelation as SchemaRelation
            # Build lookup: rdf_id → entity name
            id_to_name = {rec["rdf_id"]: rec["name"] for rec in cim_records if rec["rdf_id"]}
            for rec in cim_records:
                for attr_key, ref_id in rec["attrs"].items():
                    if not attr_key.endswith("_ref"):
                        continue
                    target_name = id_to_name.get(ref_id)
                    if not target_name:
                        continue
                    relation_type = attr_key.replace("_ref", "").upper()
                    relations.append(SchemaRelation(
                        source=rec["name"],
                        relation=relation_type,
                        target=target_name,
                        confidence=1.0,
                    ))

        doc = ExtractedDocument(
            job_id=job_id,
            file_name=file_name,
            file_type=file_type,
            raw_text=parse_result.text[:50_000],   # limite pour stockage
            entities=entities,
            relations=relations,
            keywords=keywords,
            metadata={
                **parse_result.metadata,
                "chunks_count": len(chunks),
                "entities_count": len(entities),
                "keywords": keywords,
            },
        )

        await progress(100, "Done")
        return doc, chunks
