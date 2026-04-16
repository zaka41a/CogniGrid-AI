"""
Shared embedding singleton — avoids reloading the model on every request.
Falls back to zero-vectors if sentence-transformers is not installed.
"""
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_DIM   = 384


def get_embedder():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model: %s", settings.embedding_model)
            _model = SentenceTransformer(settings.embedding_model)
        except Exception as e:
            logger.warning("sentence-transformers not available (%s) — using zero-vector fallback", e)
            _model = None
    return _model


def embed(text: str) -> list[float]:
    model = get_embedder()
    if model is None:
        return [0.0] * _DIM
    return model.encode(text, normalize_embeddings=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_embedder()
    if model is None:
        return [[0.0] * _DIM for _ in texts]
    return model.encode(texts, normalize_embeddings=True).tolist()
