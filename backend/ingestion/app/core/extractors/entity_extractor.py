"""
Entity Extractor — utilise SpaCy pour la reconnaissance d'entités nommées (NER).

Types d'entités détectées :
  PERSON     → personnes
  ORG        → organisations, entreprises
  GPE        → pays, villes
  LOCATION   → lieux
  DATE       → dates
  MONEY      → montants
  PRODUCT    → produits
  EVENT      → événements
  CONCEPT    → concepts généraux (via KeyBERT)
"""
import spacy
from keybert import KeyBERT
from app.config import settings
from app.models.schemas import ExtractedEntity

# Chargement des modèles au démarrage (une seule fois)
_nlp = None
_kw_model = None


def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_trf")   # modèle transformer (plus précis)
        except OSError:
            _nlp = spacy.load("en_core_web_sm")    # fallback modèle léger
    return _nlp


def get_kw_model():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT()
    return _kw_model


class EntityExtractor:

    def extract(self, text: str) -> tuple[list[ExtractedEntity], list[str]]:
        """
        Retourne (entities, keywords).
        Limite le texte à 100k chars pour la performance.
        """
        text = text[:100_000]

        entities  = self._extract_ner(text)
        keywords  = self._extract_keywords(text)

        return entities, keywords

    def _extract_ner(self, text: str) -> list[ExtractedEntity]:
        nlp = get_nlp()
        doc = nlp(text)

        seen     = set()
        entities = []

        WANTED_TYPES = {"PERSON", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", "DATE", "MONEY", "WORK_OF_ART"}

        for ent in doc.ents:
            if ent.label_ not in WANTED_TYPES:
                continue
            key = (ent.text.strip().lower(), ent.label_)
            if key in seen or len(ent.text.strip()) < 2:
                continue
            seen.add(key)
            entities.append(ExtractedEntity(
                name=ent.text.strip(),
                type=ent.label_,
                confidence=0.85,       # SpaCy ne donne pas de score de confiance direct
                source_page=None,
                embedding=None,        # Sera ajouté par l'Embedder
            ))

        return entities

    def _extract_keywords(self, text: str) -> list[str]:
        """Extrait les 15 mots-clés les plus représentatifs du document."""
        try:
            kw_model = get_kw_model()
            keywords = kw_model.extract_keywords(
                text[:10_000],
                keyphrase_ngram_range=(1, 2),
                stop_words="english",
                top_n=15,
            )
            return [kw for kw, score in keywords if score > 0.3]
        except Exception:
            return []
