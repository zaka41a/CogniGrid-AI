"""
CIM XML Parser — parses IEC CIM/RDF power system XML files.

Extracts CIM entities (Substation, BusbarSection, ACLineSegment,
PowerTransformer, etc.) and their attributes as structured data,
without requiring any ML dependencies.

CIM files use RDF/XML with namespaces like:
  cim: http://iec.ch/TC57/2013/CIM-schema-cim16#
  rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns#
"""

import lxml.etree as ET
from .base import BaseParser, ParseResult

# ── CIM classes we care about (and their human-readable types) ────────────────
CIM_ENTITY_TYPES = {
    "Substation":              "SUBSTATION",
    "VoltageLevel":            "VOLTAGE_LEVEL",
    "BusbarSection":           "BUSBAR",
    "ACLineSegment":           "LINE_SEGMENT",
    "PowerTransformer":        "TRANSFORMER",
    "PowerTransformerEnd":     "TRANSFORMER_END",
    "EnergyConsumer":          "LOAD",
    "GeneratingUnit":          "GENERATOR",
    "SynchronousMachine":      "GENERATOR",
    "ExternalNetworkInjection":"GENERATOR",
    "Terminal":                "TERMINAL",
    "ConnectivityNode":        "CONNECTIVITY_NODE",
    "BaseVoltage":             "BASE_VOLTAGE",
    "GeographicalRegion":      "REGION",
    "SubGeographicalRegion":   "SUB_REGION",
    "OperationalLimitSet":     "LIMIT_SET",
    "CurrentLimit":            "CURRENT_LIMIT",
    "VoltageLimit":            "VOLTAGE_LIMIT",
    "LoadArea":                "LOAD_AREA",
    "Switch":                  "SWITCH",
    "Breaker":                 "SWITCH",
    "Disconnector":            "SWITCH",
    "LoadBreakSwitch":         "SWITCH",
    "Junction":                "JUNCTION",
    "Line":                    "LINE",
    "Bay":                     "BAY",
}

# Attributes we extract from each CIM element
CIM_ATTRS = {
    "IdentifiedObject.name",
    "IdentifiedObject.description",
    "IdentifiedObject.aliasName",
    "ACLineSegment.length",
    "ACLineSegment.r",
    "ACLineSegment.x",
    "ACLineSegment.b",
    "BaseVoltage.nominalVoltage",
    "VoltageLevel.lowVoltageLimit",
    "VoltageLevel.highVoltageLimit",
    "ConductingEquipment.phases",
    "EnergyConsumer.p",
    "EnergyConsumer.q",
    "GeneratingUnit.nominalP",
    "GeneratingUnit.maxOperatingP",
    "GeneratingUnit.minOperatingP",
    "SynchronousMachine.ratedS",
    "PowerTransformerEnd.ratedU",
    "PowerTransformerEnd.ratedS",
}


def _strip_ns(tag: str) -> str:
    """'{http://...}LocalName' → 'LocalName'"""
    return tag.split("}")[1] if "}" in tag else tag


def _get_rdf_id(elem: ET._Element) -> str:
    """Extract rdf:ID or rdf:about from element."""
    for attr_name, attr_val in elem.attrib.items():
        local = _strip_ns(attr_name)
        if local in ("ID", "about"):
            return attr_val.lstrip("#")
    return ""


class CIMXMLParser(BaseParser):
    """Parses CIM/RDF XML power system files into structured entities."""

    def supported_extensions(self) -> list[str]:
        return [".xml", ".xsd", ".rdf", ".owl", ".cim"]

    def _is_cim_file(self, root: ET._Element) -> bool:
        """Detect if this is a CIM/RDF file by checking namespaces."""
        ns_values = list(root.nsmap.values()) if root.nsmap else []
        return any("iec.ch" in ns or "cim" in ns.lower() for ns in ns_values)

    def parse(self, file_path: str) -> ParseResult:
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
        except ET.XMLSyntaxError:
            # Fallback to plain text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            return ParseResult(text=text, metadata={}, pages=[text], tables=[], images_text=[])

        if not self._is_cim_file(root):
            # Generic XML: dump text as before
            texts = [e.text.strip() for e in root.iter() if e.text and e.text.strip()]
            full_text = "\n".join(texts)
            return ParseResult(text=full_text, metadata={"root_tag": root.tag}, pages=[full_text], tables=[], images_text=[])

        return self._parse_cim(root, file_path)

    def _parse_cim(self, root: ET._Element, file_path: str) -> ParseResult:
        entities_text: list[str] = []
        entity_records: list[dict] = []

        # Build namespace map for CIM prefix
        ns_map = root.nsmap  # prefix → URI
        cim_uri = next((v for v in ns_map.values() if "iec.ch" in v or "cim" in v.lower()), None)

        for elem in root:
            local_tag = _strip_ns(elem.tag)

            # Check if this CIM class is one we track
            cim_type = CIM_ENTITY_TYPES.get(local_tag)
            if cim_type is None:
                continue

            rdf_id = _get_rdf_id(elem)
            attrs: dict[str, str] = {}

            # Collect child attribute elements
            name_val = ""
            for child in elem:
                child_local = _strip_ns(child.tag)
                # Strip CIM class prefix: "IdentifiedObject.name" → "name"
                short = child_local.split(".")[-1] if "." in child_local else child_local

                if child.text and child.text.strip():
                    attrs[short] = child.text.strip()

                if short == "name":
                    name_val = child.text.strip() if child.text else ""

                # rdf:resource references (associations)
                for attr_name, attr_val in child.attrib.items():
                    if _strip_ns(attr_name) == "resource":
                        attrs[f"{short}_ref"] = attr_val.lstrip("#")

            display_name = name_val or rdf_id or local_tag

            # Build human-readable text summary for this entity
            attr_lines = [f"  {k}: {v}" for k, v in attrs.items() if k not in ("name",)]
            summary = f"{cim_type}: {display_name}"
            if attr_lines:
                summary += "\n" + "\n".join(attr_lines)
            entities_text.append(summary)

            entity_records.append({
                "rdf_id":   rdf_id,
                "cim_class": local_tag,
                "cim_type": cim_type,
                "name":     display_name,
                "attrs":    attrs,
            })

        # Count entity types for metadata
        type_counts: dict[str, int] = {}
        for rec in entity_records:
            type_counts[rec["cim_type"]] = type_counts.get(rec["cim_type"], 0) + 1

        full_text = "\n\n".join(entities_text) if entities_text else f"CIM file: {file_path}"

        metadata = {
            "format":       "CIM/RDF XML",
            "entity_count": len(entity_records),
            "entity_types": type_counts,
            "cim_uri":      cim_uri or "",
        }

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text],
            tables=[[rec["cim_class"], rec["name"], str(rec["attrs"])] for rec in entity_records],
            images_text=[],
            # Attach records so the pipeline can use them directly
            extra={"cim_entities": entity_records},
        )
