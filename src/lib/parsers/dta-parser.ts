// ============================================================
// Stata .dta File Parser
// Supports formats 113-119 using @jbearak/dta-parser
// ============================================================

import type { ParsedData } from "@/types";

export async function parseDtaFile(file: File): Promise<ParsedData> {
  const { parse_metadata, read_rows_from_buffer } = await import("@jbearak/dta-parser");

  const buffer = await file.arrayBuffer();
  const meta = parse_metadata(buffer);

  const headers = meta.variables.map((v) => v.name);
  const rows = read_rows_from_buffer(buffer, meta, 0, meta.nobs);

  const parsedRows: Record<string, unknown>[] = [];
  for (const row of rows) {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      const cell = row[i];
      if (cell !== undefined && cell !== null && (typeof cell === "number" || typeof cell === "string")) {
        obj[headers[i]] = cell;
      } else if (cell && typeof cell === "object" && "kind" in cell && cell.kind === "missing") {
        obj[headers[i]] = NaN;
      } else {
        obj[headers[i]] = cell ?? "";
      }
    }
    parsedRows.push(obj);
  }

  return {
    headers,
    rows: parsedRows,
    rowCount: meta.nobs,
    colCount: meta.nvar,
    fileName: file.name,
    fileType: "dta",
  };
}
