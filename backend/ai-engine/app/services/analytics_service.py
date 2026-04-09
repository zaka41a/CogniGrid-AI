"""
AnalyticsService — document similarity, clustering, insights, knowledge gaps.
"""
import logging
import numpy as np
from neo4j import AsyncGraphDatabase
from qdrant_client import AsyncQdrantClient
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize
from app.config import settings
from app.models.schemas import (
    SimilarityResult,
    ClusterResult,
    ClusterResponse,
    DocumentInsight,
    KnowledgeGap,
    KnowledgeGapsResponse,
)

logger = logging.getLogger(__name__)


class AnalyticsService:

    def __init__(self):
        self._neo4j = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        self._qdrant = AsyncQdrantClient(url=settings.qdrant_url)

    # ── Document Similarity ────────────────────────────────────────────────

    async def similar_documents(
        self, doc_id: str, top_k: int = 5
    ) -> list[SimilarityResult]:
        """Find docs most similar to a given doc using Qdrant scroll + cosine."""
        # Get all points for this doc
        points, _ = await self._qdrant.scroll(
            collection_name=settings.qdrant_collection,
            scroll_filter={"must": [{"key": "job_id", "match": {"value": doc_id}}]},
            with_vectors=True,
            limit=10,
        )
        if not points:
            return []

        # Average vector for the document
        vecs = np.array([p.vector for p in points if p.vector is not None])
        if len(vecs) == 0:
            return []
        avg_vec = normalize(vecs.mean(axis=0).reshape(1, -1))[0].tolist()

        # Search for similar documents
        results = await self._qdrant.search(
            collection_name=settings.qdrant_collection,
            query_vector=avg_vec,
            limit=top_k * 3,
            with_payload=True,
        )

        # Group by doc_id, exclude self
        seen: dict[str, float] = {}
        for r in results:
            d = r.payload.get("job_id", "")
            if d and d != doc_id and d not in seen:
                seen[d] = r.score

        return [
            SimilarityResult(
                doc_id=d,
                file_name="",
                score=round(s, 4),
            )
            for d, s in sorted(seen.items(), key=lambda x: -x[1])[:top_k]
        ]

    # ── Clustering ─────────────────────────────────────────────────────────

    async def cluster_documents(
        self, n_clusters: int = 5, doc_ids: list[str] | None = None
    ) -> ClusterResponse:
        """K-Means clustering of document embeddings."""
        # Scroll all points
        all_points = []
        offset = None
        while True:
            batch, offset = await self._qdrant.scroll(
                collection_name=settings.qdrant_collection,
                offset=offset,
                with_vectors=True,
                with_payload=True,
                limit=100,
            )
            all_points.extend(batch)
            if offset is None:
                break

        if not all_points:
            return ClusterResponse(clusters=[], total_docs=0)

        # Aggregate by doc_id → mean vector
        doc_vecs: dict[str, list] = {}
        for p in all_points:
            d = p.payload.get("job_id", "")
            if p.vector and d:
                if d not in doc_vecs:
                    doc_vecs[d] = []
                doc_vecs[d].append(p.vector)

        if doc_ids:
            doc_vecs = {k: v for k, v in doc_vecs.items() if k in doc_ids}

        if len(doc_vecs) < n_clusters:
            n_clusters = max(1, len(doc_vecs))

        ids   = list(doc_vecs.keys())
        vecs  = np.array([np.mean(v, axis=0) for v in doc_vecs.values()])
        vecs  = normalize(vecs)

        km      = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
        labels  = km.fit_predict(vecs)

        clusters: dict[int, list[str]] = {}
        for doc_id, label in zip(ids, labels):
            clusters.setdefault(int(label), []).append(doc_id)

        return ClusterResponse(
            clusters=[
                ClusterResult(cluster_id=cid, doc_ids=dids)
                for cid, dids in clusters.items()
            ],
            total_docs=len(ids),
        )

    # ── Document Insights ──────────────────────────────────────────────────

    async def document_insights(self, doc_id: str) -> DocumentInsight | None:
        async with self._neo4j.session() as session:
            result = await session.run(
                """
                MATCH (d:Document {doc_id: $doc_id})
                OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
                OPTIONAL MATCH (e)-[r:RELATED_TO]->()
                RETURN d.file_name AS file_name, d.file_type AS file_type,
                       collect(DISTINCT {text: e.text, label: e.label}) AS entities,
                       count(DISTINCT r) AS rel_count
                """,
                {"doc_id": doc_id},
            )
            row = await result.single()

        if not row:
            return None

        entities = [e for e in row["entities"] if e.get("text")]
        keywords = [e["text"] for e in entities if e.get("label") == "KEYWORD"][:10]
        top_ents = entities[:10]

        return DocumentInsight(
            doc_id=doc_id,
            file_name=row["file_name"] or "",
            file_type=row["file_type"] or "",
            top_entities=top_ents,
            top_keywords=keywords,
            entity_count=len(entities),
            relation_count=row["rel_count"] or 0,
        )

    # ── Knowledge Gaps ─────────────────────────────────────────────────────

    async def knowledge_gaps(self) -> KnowledgeGapsResponse:
        """
        Finds entities that are poorly connected (isolated nodes).
        These represent potential knowledge gaps.
        """
        async with self._neo4j.session() as session:
            total_result = await session.run("MATCH (e:Entity) RETURN count(e) AS total")
            total_row = await total_result.single()
            total_entities = total_row["total"] if total_row else 0

            gap_result = await session.run(
                """
                MATCH (e:Entity)
                WHERE NOT (e)-[:RELATED_TO]-()
                WITH e, size([(d:Document)-[:MENTIONS]->(e) | d]) AS doc_count
                RETURN e.text AS topic, doc_count,
                       count(*) AS mention_count
                ORDER BY doc_count ASC, mention_count DESC
                LIMIT 20
                """
            )
            gaps_data = await gap_result.data()

        isolated = len(gaps_data)
        ratio = isolated / total_entities if total_entities > 0 else 0.0

        gaps = [
            KnowledgeGap(
                topic=g["topic"] or "",
                mentioned_count=g["mention_count"] or 0,
                connected_docs=g["doc_count"] or 0,
                description=f"Entity appears in {g['doc_count']} doc(s) but has no graph relations",
            )
            for g in gaps_data
        ]

        return KnowledgeGapsResponse(
            gaps=gaps,
            total_entities=total_entities,
            isolated_entity_ratio=round(ratio, 4),
        )

    async def close(self):
        await self._neo4j.close()
