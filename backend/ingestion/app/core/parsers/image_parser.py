"""
Image Parser — utilise EasyOCR pour extraire le texte des images.
Supporte JPEG, PNG, TIFF, BMP, WEBP.
EasyOCR supporte + de 80 langues sans configuration.
"""
import easyocr
from PIL import Image
from .base import BaseParser, ParseResult

# Initialisation du reader EasyOCR (fait une seule fois au démarrage)
_reader = None


def get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["en", "fr"], gpu=False)
    return _reader


class ImageParser(BaseParser):

    def supported_extensions(self) -> list[str]:
        return [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"]

    def parse(self, file_path: str) -> ParseResult:
        # Métadonnées image
        with Image.open(file_path) as img:
            metadata = {
                "width":  img.width,
                "height": img.height,
                "mode":   img.mode,
                "format": img.format,
            }

        # Extraction de texte par OCR
        reader  = get_reader()
        results = reader.readtext(file_path)

        # Concatène les textes avec leur confidence
        lines = [text for (_, text, conf) in results if conf > 0.3]
        full_text = "\n".join(lines)

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text],
            tables=[],
            images_text=[full_text],
        )
