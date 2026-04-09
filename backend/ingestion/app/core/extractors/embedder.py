"""
Embedder — génère des vecteurs (embeddings) pour chaque entité et pour le document.
Utilise sentence-transformers (all-MiniLM-L6-v2 par défaut, 384 dimensions).
Ces vecteurs sont stockés dans Qdrant pour la recherche sémantique (RAG).
"""
from sentence_transformers import SentenceTransformer
from app.config import settings

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


class Embedder:

    def embed_text(self, text: str) -> list[float]:
        """Génère un vecteur pour un texte."""
        model = get_model()
        return model.encode(text[:512], normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Génère des vecteurs pour une liste de textes (plus efficace en batch)."""
        model = get_model()
        truncated = [t[:512] for t in texts]
        return model.encode(truncated, normalize_embeddings=True, batch_size=32).tolist()

    def embed_chunks(self, text: str, chunk_size: int = 512, overlap: int = 50) -> list[dict]:
        """
        Découpe le texte en chunks et génère un vecteur par chunk.
        Utilisé pour indexer les longs documents dans Qdrant.
        """
        words  = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text  = " ".join(chunk_words)
            chunks.append({
                "text":      chunk_text,
                "chunk_idx": i // (chunk_size - overlap),
                "embedding": self.embed_text(chunk_text),
            })

        return chunks
