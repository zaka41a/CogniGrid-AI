"""
Text / JSON / XML Parser — pour les formats texte simples.
"""
import json
import lxml.etree as ET
from .base import BaseParser, ParseResult


class TextParser(BaseParser):
    def supported_extensions(self) -> list[str]:
        return [".txt", ".md", ".rst", ".log"]

    def parse(self, file_path: str) -> ParseResult:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return ParseResult(text=text, metadata={}, pages=[text], tables=[], images_text=[])


class JSONParser(BaseParser):
    def supported_extensions(self) -> list[str]:
        return [".json", ".jsonl"]

    def parse(self, file_path: str) -> ParseResult:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Aplatit le JSON en texte lisible
        text = json.dumps(data, indent=2, ensure_ascii=False)
        metadata = {
            "type": type(data).__name__,
            "keys": list(data.keys()) if isinstance(data, dict) else [],
            "length": len(data) if isinstance(data, list) else 1,
        }
        return ParseResult(text=text, metadata=metadata, pages=[text], tables=[], images_text=[])


class XMLParser(BaseParser):
    def supported_extensions(self) -> list[str]:
        return [".xml", ".xsd", ".rdf", ".owl"]

    def parse(self, file_path: str) -> ParseResult:
        tree = ET.parse(file_path)
        root = tree.getroot()

        # Extrait tout le texte des noeuds
        texts = [elem.text.strip() for elem in root.iter() if elem.text and elem.text.strip()]
        full_text = "\n".join(texts)

        metadata = {
            "root_tag":  root.tag,
            "namespaces": list(root.nsmap.values()) if root.nsmap else [],
            "elements":  len(list(root.iter())),
        }
        return ParseResult(text=full_text, metadata=metadata, pages=[full_text], tables=[], images_text=[])
