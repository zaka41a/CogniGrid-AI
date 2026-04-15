"""
Embedder — generates vectors (embeddings) for entities and documents.
Uses sentence-transformers (all-MiniLM-L6-v2 by default, 384 dimensions).
If sentence-transformers is not installed, returns empty embeddings gracefully.
"""
import logging
from app.config import settings

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False
    logger.warning("sentence-transformers not installed — embeddings disabled (vectors will be empty)")

_model = None


def get_model():
    global _model
    if not _ST_AVAILABLE:
        return None
    if _model is None:
        try:
            _model = SentenceTransformer(settings.embedding_model)
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}")
    return _model


class Embedder:

    def embed_text(self, text: str) -> list[float]:
        model = get_model()
        if model is None:
            return []
        try:
            return model.encode(text[:512], normalize_embeddings=True).tolist()
        except Exception as e:
            logger.warning(f"embed_text failed: {e}")
            return []

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        model = get_model()
        if model is None:
            return [[] for _ in texts]
        try:
            truncated = [t[:512] for t in texts]
            return model.encode(truncated, normalize_embeddings=True, batch_size=32).tolist()
        except Exception as e:
            logger.warning(f"embed_batch failed: {e}")
            return [[] for _ in texts]

    def embed_chunks(self, text: str, chunk_size: int = 512, overlap: int = 50) -> list[dict]:
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
