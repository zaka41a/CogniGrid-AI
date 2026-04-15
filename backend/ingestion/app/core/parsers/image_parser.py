"""
Image Parser — uses EasyOCR to extract text from images.
Supports JPEG, PNG, TIFF, BMP, WEBP.
If easyocr or PIL are not installed, returns empty text gracefully.
"""
import logging
from .base import BaseParser, ParseResult

logger = logging.getLogger(__name__)

try:
    import easyocr
    _EASYOCR_AVAILABLE = True
except ImportError:
    _EASYOCR_AVAILABLE = False
    logger.warning("easyocr not installed — image OCR disabled")

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("Pillow not installed — image metadata disabled")

_reader = None


def get_reader():
    global _reader
    if not _EASYOCR_AVAILABLE:
        return None
    if _reader is None:
        try:
            _reader = easyocr.Reader(["en", "fr"], gpu=False)
        except Exception as e:
            logger.warning(f"EasyOCR init failed: {e}")
    return _reader


class ImageParser(BaseParser):

    def supported_extensions(self) -> list[str]:
        return [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"]

    def parse(self, file_path: str) -> ParseResult:
        metadata = {}

        if _PIL_AVAILABLE:
            try:
                with Image.open(file_path) as img:
                    metadata = {
                        "width":  img.width,
                        "height": img.height,
                        "mode":   img.mode,
                        "format": img.format,
                    }
            except Exception as e:
                logger.warning(f"Image metadata extraction failed: {e}")

        full_text = ""
        reader = get_reader()
        if reader is not None:
            try:
                results  = reader.readtext(file_path)
                lines    = [text for (_, text, conf) in results if conf > 0.3]
                full_text = "\n".join(lines)
            except Exception as e:
                logger.warning(f"OCR failed: {e}")

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text] if full_text else [],
            tables=[],
            images_text=[full_text] if full_text else [],
        )
