"""
CSV / Excel Parser — utilise pandas pour lire les fichiers tabulaires.
Convertit chaque ligne en texte lisible + extrait les métadonnées du dataset.

Pour les CSVs entités-relations (colonnes source/target/relationship),
les données sont converties directement en cim_entities pour bypasser le NER.
"""
import logging
import pandas as pd
from .base import BaseParser, ParseResult

logger = logging.getLogger(__name__)

# Patterns de colonnes qui indiquent un CSV entités-relations
_SRC_COLS  = {"source", "from", "src", "subject", "head", "entity_1", "entity1", "start_node"}
_TGT_COLS  = {"target", "to", "tgt", "object", "tail", "entity_2", "entity2", "end_node"}
_REL_COLS  = {"relationship", "relation", "predicate", "edge_type", "type", "label", "rel", "edge", "relationship_type"}
_TYPE_COLS = {"source_type", "src_type", "from_type", "entity_type", "type"}


def _detect_er_columns(cols: list[str]) -> tuple[str | None, str | None, str | None]:
    """
    Détecte les colonnes source / target / relation dans le dataframe.
    Retourne (src_col, tgt_col, rel_col) ou (None, None, None) si non trouvé.
    """
    lower = {c.lower().strip(): c for c in cols}
    src = next((lower[k] for k in _SRC_COLS if k in lower), None)
    tgt = next((lower[k] for k in _TGT_COLS if k in lower), None)
    rel = next((lower[k] for k in _REL_COLS if k in lower), None)
    return src, tgt, rel


def _er_csv_to_cim(df: pd.DataFrame, src_col: str, tgt_col: str, rel_col: str | None) -> list[dict]:
    """
    Convertit un DataFrame entités-relations en liste de cim_entities.
    Chaque entité unique reçoit un rdf_id = son nom (nettoyé).
    Les relations sont encodées comme attrs avec clés `<relation>_ref`.
    """
    entities: dict[str, dict] = {}   # nom → record

    # Détecte les colonnes de type (optionnel)
    lower_cols = {c.lower().strip(): c for c in df.columns}
    src_type_col = next((lower_cols[k] for k in _TYPE_COLS if k in lower_cols
                         and lower_cols[k] != src_col), None)

    for _, row in df.iterrows():
        src_val = str(row[src_col]).strip() if pd.notna(row[src_col]) else None
        tgt_val = str(row[tgt_col]).strip() if pd.notna(row[tgt_col]) else None
        rel_val = (str(row[rel_col]).strip().upper().replace(" ", "_")
                   if rel_col and pd.notna(row.get(rel_col)) else "RELATED_TO")

        if not src_val or not tgt_val or src_val == "nan" or tgt_val == "nan":
            continue

        # Enregistre l'entité source
        if src_val not in entities:
            src_type = (str(row[src_type_col]).strip()
                        if src_type_col and pd.notna(row.get(src_type_col)) else "Entity")
            entities[src_val] = {
                "name":     src_val,
                "cim_type": src_type,
                "rdf_id":   src_val,
                "attrs":    {},
            }
        # Enregistre l'entité cible
        if tgt_val not in entities:
            entities[tgt_val] = {
                "name":     tgt_val,
                "cim_type": "Entity",
                "rdf_id":   tgt_val,
                "attrs":    {},
            }
        # Encode la relation dans les attrs de la source
        attr_key = f"{rel_val.lower()}_ref"
        entities[src_val]["attrs"][attr_key] = tgt_val

    return list(entities.values())


class CSVParser(BaseParser):

    def supported_extensions(self) -> list[str]:
        return [".csv", ".tsv"]

    def parse(self, file_path: str) -> ParseResult:
        sep = "\t" if file_path.endswith(".tsv") else ","
        for encoding in ("utf-8", "latin-1"):
            try:
                df = pd.read_csv(
                    file_path, sep=sep, encoding=encoding,
                    low_memory=False, on_bad_lines="skip",
                )
                return self._df_to_result(df, file_path)
            except UnicodeDecodeError:
                continue
            except Exception:
                break
        # Fallback: plain text
        with open(file_path, encoding="utf-8", errors="replace") as f:
            text = f.read()
        return ParseResult(text=text, metadata={}, pages=[text], tables=[], images_text=[])

    def _df_to_result(self, df: pd.DataFrame, file_path: str) -> ParseResult:
        metadata = {
            "rows":    len(df),
            "columns": list(df.columns),
            "dtypes":  {col: str(dt) for col, dt in df.dtypes.items()},
            "nulls":   df.isnull().sum().to_dict(),
        }

        # ── Détection CSV entités-relations ──────────────────────────────────────
        src_col, tgt_col, rel_col = _detect_er_columns(list(df.columns))
        if src_col and tgt_col:
            logger.info(f"Entity-relationship CSV detected (src={src_col}, tgt={tgt_col}, rel={rel_col}) — bypassing NER")
            cim_entities = _er_csv_to_cim(df, src_col, tgt_col, rel_col)
            summary = f"Entity-relationship dataset: {len(cim_entities)} unique entities, {len(df)} relationships"
            metadata["er_csv"]    = True
            metadata["src_col"]   = src_col
            metadata["tgt_col"]   = tgt_col
            metadata["rel_col"]   = rel_col
            return ParseResult(
                text=summary,
                metadata=metadata,
                pages=[summary],
                tables=[df.head(100).values.tolist()],
                images_text=[],
                extra={"cim_entities": cim_entities},
            )

        # ── CSV générique → texte ─────────────────────────────────────────────────
        rows_text = []
        for _, row in df.head(500).iterrows():
            parts = [f"{col}: {val}" for col, val in row.items() if pd.notna(val)]
            rows_text.append(", ".join(parts))
        full_text = "\n".join(rows_text)

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text],
            tables=[df.head(100).values.tolist()],
            images_text=[],
        )


class ExcelParser(CSVParser):

    def supported_extensions(self) -> list[str]:
        return [".xlsx", ".xls", ".xlsm"]

    def parse(self, file_path: str) -> ParseResult:
        # Lit toutes les feuilles
        xl = pd.ExcelFile(file_path)
        all_text = []
        all_tables = []

        for sheet_name in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            result = self._df_to_result(df, file_path)
            all_text.append(f"[Sheet: {sheet_name}]\n{result.text}")
            all_tables.extend(result.tables)

        return ParseResult(
            text="\n\n".join(all_text),
            metadata={"sheets": xl.sheet_names},
            pages=all_text,
            tables=all_tables,
            images_text=[],
        )
