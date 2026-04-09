"""
CSV / Excel Parser — utilise pandas pour lire les fichiers tabulaires.
Convertit chaque ligne en texte lisible + extrait les métadonnées du dataset.
"""
import pandas as pd
from .base import BaseParser, ParseResult


class CSVParser(BaseParser):

    def supported_extensions(self) -> list[str]:
        return [".csv", ".tsv"]

    def parse(self, file_path: str) -> ParseResult:
        try:
            sep = "\t" if file_path.endswith(".tsv") else ","
            df  = pd.read_csv(file_path, sep=sep, encoding="utf-8", low_memory=False)
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, sep=sep, encoding="latin-1", low_memory=False)

        return self._df_to_result(df, file_path)

    def _df_to_result(self, df: pd.DataFrame, file_path: str) -> ParseResult:
        metadata = {
            "rows":    len(df),
            "columns": list(df.columns),
            "dtypes":  {col: str(dt) for col, dt in df.dtypes.items()},
            "nulls":   df.isnull().sum().to_dict(),
        }

        # Convertit le DataFrame en texte lisible (chaque ligne = phrase)
        rows_text = []
        for _, row in df.head(500).iterrows():   # limite 500 lignes pour le texte
            parts = [f"{col}: {val}" for col, val in row.items() if pd.notna(val)]
            rows_text.append(", ".join(parts))

        full_text = "\n".join(rows_text)

        # Le tableau complet pour extraction de relations
        tables = [df.head(100).values.tolist()]

        return ParseResult(
            text=full_text,
            metadata=metadata,
            pages=[full_text],
            tables=tables,
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
