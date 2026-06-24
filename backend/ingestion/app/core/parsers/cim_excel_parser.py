"""
CIM Excel Parser.

Parses the CIM-SemanticGraph-Platform spreadsheet grid format (sheets:
Info, Buses, Lines, Generators, Loads, Transformers) into structured
power-system components, so the knowledge graph and the Network Topology
view get proper BUSBAR / LINE_SEGMENT / TRANSFORMER / GENERATOR / LOAD nodes
and the edges that connect them.

Spreadsheets that are not CIM grid files fall back to the generic ExcelParser.
"""
import logging
import pandas as pd

from .base import BaseParser, ParseResult
from .csv_parser import ExcelParser

logger = logging.getLogger(__name__)

FRIENDLY = {
    "BUSBAR": "buses", "LINE_SEGMENT": "lines", "GENERATOR": "generators",
    "LOAD": "loads", "TRANSFORMER": "transformers",
}


def _norm(value) -> str:
    return str(value).strip().lower() if value is not None else ""


def _pick(row: dict, *candidates: str) -> str:
    """Return the first column value whose header matches a candidate name.

    Tries an exact (case-insensitive) header match first, then a contains match.
    """
    norm_row = {_norm(k): v for k, v in row.items()}
    for c in candidates:
        v = norm_row.get(_norm(c))
        if v is not None:
            return str(v).strip()
    for c in candidates:
        for k, v in norm_row.items():
            if _norm(c) in k and v is not None:
                return str(v).strip()
    return ""


class CIMExcelParser(BaseParser):
    """Parses CIM grid spreadsheets; delegates everything else to ExcelParser."""

    def supported_extensions(self) -> list[str]:
        return [".xlsx", ".xls"]

    def parse(self, file_path: str) -> ParseResult:
        try:
            sheets = pd.read_excel(file_path, sheet_name=None)
        except Exception as e:
            logger.warning("CIMExcelParser could not read %s: %s", file_path, e)
            return ExcelParser().parse(file_path)

        names = {_norm(s): s for s in sheets}
        # Treat it as a CIM grid file only when it has at least Buses + Lines.
        if "buses" not in names or "lines" not in names:
            return ExcelParser().parse(file_path)

        return self._parse_cim(sheets, names)

    def _parse_cim(self, sheets: dict, names: dict) -> ParseResult:
        records: list[dict] = []
        text_lines: list[str] = []

        def rows(key: str) -> list[dict]:
            sheet = names.get(key)
            if not sheet:
                return []
            df = sheets[sheet]
            df = df.where(pd.notna(df), None)
            return df.to_dict("records")

        for r in rows("buses"):
            bid = _pick(r, "Bus ID", "id", "name")
            if not bid:
                continue
            volt = _pick(r, "Voltage (kV)", "voltage")
            btype = _pick(r, "Type")
            records.append({"rdf_id": bid, "cim_class": "BusbarSection",
                            "cim_type": "BUSBAR", "name": bid, "attrs": {}})
            text_lines.append(f"BUSBAR {bid}: voltage {volt} kV, type {btype}")

        for r in rows("lines"):
            lid = _pick(r, "Line ID", "id")
            if not lid:
                continue
            fb, tb = _pick(r, "From Bus", "from"), _pick(r, "To Bus", "to")
            length = _pick(r, "Length (km)", "length")
            attrs = {}
            if fb:
                attrs["from_bus_ref"] = fb
            if tb:
                attrs["to_bus_ref"] = tb
            records.append({"rdf_id": lid, "cim_class": "ACLineSegment",
                            "cim_type": "LINE_SEGMENT", "name": lid, "attrs": attrs})
            text_lines.append(f"LINE_SEGMENT {lid}: from {fb} to {tb}, length {length} km")

        for r in rows("generators"):
            gid = _pick(r, "Gen ID", "id")
            if not gid:
                continue
            bus = _pick(r, "Bus")
            fuel = _pick(r, "Fuel Type", "fuel")
            pmax = _pick(r, "Pmax (MW)", "pmax")
            records.append({"rdf_id": gid, "cim_class": "SynchronousMachine",
                            "cim_type": "GENERATOR", "name": gid,
                            "attrs": {"bus_ref": bus} if bus else {}})
            text_lines.append(f"GENERATOR {gid}: bus {bus}, fuel {fuel}, Pmax {pmax} MW")

        for r in rows("loads"):
            ldid = _pick(r, "Load ID", "id")
            if not ldid:
                continue
            bus = _pick(r, "Bus")
            p = _pick(r, "P (MW)", "p")
            records.append({"rdf_id": ldid, "cim_class": "EnergyConsumer",
                            "cim_type": "LOAD", "name": ldid,
                            "attrs": {"bus_ref": bus} if bus else {}})
            text_lines.append(f"LOAD {ldid}: bus {bus}, P {p} MW")

        for r in rows("transformers"):
            tid = _pick(r, "Trafo ID", "id")
            if not tid:
                continue
            pb, sb = _pick(r, "Primary Bus", "primary"), _pick(r, "Secondary Bus", "secondary")
            attrs = {}
            if pb:
                attrs["primary_bus_ref"] = pb
            if sb:
                attrs["secondary_bus_ref"] = sb
            records.append({"rdf_id": tid, "cim_class": "PowerTransformer",
                            "cim_type": "TRANSFORMER", "name": tid, "attrs": attrs})
            text_lines.append(f"TRANSFORMER {tid}: primary {pb}, secondary {sb}")

        type_counts: dict[str, int] = {}
        for rec in records:
            type_counts[rec["cim_type"]] = type_counts.get(rec["cim_type"], 0) + 1

        counts = ", ".join(f"{type_counts[t]} {FRIENDLY.get(t, t)}" for t in type_counts)
        header = f"CIM power grid network: {counts}." if counts else "CIM power grid network."
        full_text = header + "\n\n" + "\n".join(text_lines)

        metadata = {
            "format": "CIM Excel",
            "entity_count": len(records),
            "entity_types": type_counts,
        }

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text],
            tables=[[rec["cim_type"], rec["name"], str(rec["attrs"])] for rec in records],
            images_text=[],
            extra={"cim_entities": records},
        )
