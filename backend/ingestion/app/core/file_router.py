"""
FileRouter — détecte le type de fichier par extension + magic bytes
et retourne le parser approprié.
"""
import os
from .parsers.base import BaseParser, ParseResult
from .parsers.pdf_parser   import PDFParser
from .parsers.docx_parser  import DocxParser
from .parsers.csv_parser   import CSVParser, ExcelParser
from .parsers.image_parser import ImageParser
from .parsers.text_parser  import TextParser, JSONParser
from .parsers.cim_xml_parser import CIMXMLParser


class FileRouter:
    """Sélectionne et exécute le bon parser selon l'extension du fichier."""

    def __init__(self):
        self._parsers: list[BaseParser] = [
            PDFParser(),
            DocxParser(),
            CSVParser(),
            ExcelParser(),
            ImageParser(),
            JSONParser(),
            CIMXMLParser(),  # handles both CIM/RDF and generic XML
            TextParser(),    # fallback
        ]

    def get_parser(self, file_path: str) -> BaseParser:
        ext = os.path.splitext(file_path)[1].lower()
        for parser in self._parsers:
            if parser.supports(ext):
                return parser
        return TextParser()   # fallback pour tout fichier inconnu

    def parse(self, file_path: str) -> ParseResult:
        parser = self.get_parser(file_path)
        return parser.parse(file_path)

    def detect_file_type(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        mapping = {
            ".pdf":  "pdf",
            ".docx": "docx", ".doc": "docx",
            ".pptx": "pptx", ".ppt": "pptx",
            ".csv":  "csv",  ".tsv": "csv",
            ".xlsx": "excel", ".xls": "excel",
            ".jpg":  "image", ".jpeg": "image",
            ".png":  "image", ".tiff": "image", ".bmp": "image",
            ".json": "json", ".jsonl": "json",
            ".xml":  "xml",  ".xsd": "xml",
            ".txt":  "txt",  ".md": "txt",
        }
        return mapping.get(ext, "other")
