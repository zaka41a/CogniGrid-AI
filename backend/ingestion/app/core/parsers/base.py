from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ParseResult:
    """Résultat standardisé de tous les parsers."""
    text: str                    # Texte brut extrait
    metadata: dict               # Titre, auteur, pages, etc.
    pages: list[str]             # Texte par page (si applicable)
    tables: list[list[list]]     # Tableaux extraits
    images_text: list[str]       # Texte extrait des images (OCR)
    extra: dict = None           # Données structurées spécifiques au parser (ex: CIM entities)


class BaseParser(ABC):
    """Interface commune pour tous les parsers de fichiers."""

    @abstractmethod
    def parse(self, file_path: str) -> ParseResult:
        """Parse le fichier et retourne le texte et métadonnées."""
        ...

    def supports(self, file_extension: str) -> bool:
        return file_extension.lower() in self.supported_extensions()

    @abstractmethod
    def supported_extensions(self) -> list[str]:
        ...
