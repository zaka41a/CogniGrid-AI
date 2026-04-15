"""
Entity Extractor — NER via SpaCy + keywords via KeyBERT.
Both are optional: if packages are missing, returns empty results gracefully.
"""
import logging
from app.models.schemas import ExtractedEntity

logger = logging.getLogger(__name__)

# ── Optional imports ──────────────────────────────────────────────────────────
try:
    import spacy
    _NLP_AVAILABLE = True
except ImportError:
    _NLP_AVAILABLE = False
    logger.warning("spacy not installed — NER disabled")

try:
    from keybert import KeyBERT
    _KW_AVAILABLE = True
except ImportError:
    _KW_AVAILABLE = False
    logger.warning("keybert not installed — keyword extraction disabled")

_nlp      = None
_kw_model = None


def get_nlp():
    global _nlp
    if not _NLP_AVAILABLE:
        return None
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("SpaCy model not found — NER disabled")
    return _nlp


def get_kw_model():
    global _kw_model
    if not _KW_AVAILABLE:
        return None
    if _kw_model is None:
        try:
            _kw_model = KeyBERT()
        except Exception as e:
            logger.warning(f"KeyBERT init failed: {e}")
    return _kw_model


class EntityExtractor:

    def extract(self, text: str) -> tuple[list[ExtractedEntity], list[str]]:
        text     = text[:100_000]
        entities = self._extract_ner(text)
        keywords = self._extract_keywords(text)
        return entities, keywords

    def _extract_ner(self, text: str) -> list[ExtractedEntity]:
        nlp = get_nlp()
        if nlp is None:
            return []
        try:
            doc     = nlp(text)
            seen    = set()
            results = []
            WANTED  = {"PERSON", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", "DATE", "MONEY"}
            for ent in doc.ents:
                if ent.label_ not in WANTED:
                    continue
                key = (ent.text.strip().lower(), ent.label_)
                if key in seen or len(ent.text.strip()) < 2:
                    continue
                seen.add(key)
                results.append(ExtractedEntity(
                    name=ent.text.strip(), type=ent.label_,
                    confidence=0.85, source_page=None, embedding=None,
                ))
            return results
        except Exception as e:
            logger.warning(f"NER failed: {e}")
            return []

    def _extract_keywords(self, text: str) -> list[str]:
        kw = get_kw_model()
        if kw is None:
            # Fallback: simple word frequency
            words = [w.lower() for w in text.split() if len(w) > 4]
            freq  = {}
            for w in words:
                freq[w] = freq.get(w, 0) + 1
            return sorted(freq, key=lambda x: -freq[x])[:10]
        try:
            kws = kw.extract_keywords(text[:10_000], keyphrase_ngram_range=(1, 2),
                                       stop_words="english", top_n=15)
            return [kw for kw, score in kws if score > 0.3]
        except Exception:
            return []
