"""
PDF Parser — utilise PyMuPDF pour le texte et pdfplumber pour les tableaux.
PyMuPDF est rapide pour extraire le texte brut.
pdfplumber est plus précis pour détecter et extraire les tableaux.
"""
import fitz          # PyMuPDF
import pdfplumber
from .base import BaseParser, ParseResult


class PDFParser(BaseParser):

    def supported_extensions(self) -> list[str]:
        return [".pdf"]

    def parse(self, file_path: str) -> ParseResult:
        pages_text = []
        tables     = []
        metadata   = {}

        # ── Texte par page avec PyMuPDF (rapide) ─────────────────────────────
        with fitz.open(file_path) as doc:
            metadata = {
                "title":    doc.metadata.get("title", ""),
                "author":   doc.metadata.get("author", ""),
                "subject":  doc.metadata.get("subject", ""),
                "pages":    doc.page_count,
            }
            for page in doc:
                pages_text.append(page.get_text("text"))

        # ── Tableaux avec pdfplumber (précis) ────────────────────────────────
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    if table:
                        tables.append(table)

        full_text = "\n\n".join(pages_text)

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=pages_text,
            tables=tables,
            images_text=[],
        )
