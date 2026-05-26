// ============================================================
// Codebook Parser — CSV / JSON / SPSS / XLSX / PDF / Markdown
// ============================================================

import type { CodebookSchema } from "./schema";
import Papa from "papaparse";

interface ParsedRow {
  id: string;
  text: string;
  labels: string[];
  values: number[];
}

export async function parseCodebookFile(file: File): Promise<CodebookSchema> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".json")) {
    const text = await file.text();
    return parseJSONCodebook(text, file.name);
  }

  if (name.endsWith(".sps")) {
    const text = await file.text();
    return parseSPSSSyntax(text, file.name);
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseXLSXCodebook(file);
  }

  if (name.endsWith(".pdf")) {
    return parsePDFCodebook(file);
  }

  if (name.endsWith(".md")) {
    const text = await file.text();
    return parseMarkdownCodebook(text, file.name);
  }

  const text = await file.text();
  return parseCSVCodebook(text, file.name);
}

// ---- CSV ----

function parseCSVCodebook(text: string, source: string): CodebookSchema {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows: ParsedRow[] = [];

  for (const row of result.data as Record<string, string>[]) {
    const id = row["question_id"] || row["id"] || row["变量名"] || row["variable"] || "";
    const text_q = row["question_text"] || row["text"] || row["题目"] || row["label"] || "";
    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 1; i <= 10; i++) {
      const label = row[`label_${i}`] || row[`选项${i}`];
      const val = row[`value_${i}`] || row[`值${i}`];
      if (label && val !== undefined) { labels.push(label.trim()); values.push(Number(val)); }
    }

    if (labels.length === 0 && row["labels"] && row["values"]) {
      const ls = row["labels"].split(",").map((s) => s.trim()).filter(Boolean);
      const vs = row["values"].split(",").map(Number).filter((n) => !isNaN(n));
      if (ls.length === vs.length) { labels.push(...ls); values.push(...vs); }
    }

    if (id && labels.length > 0) rows.push({ id, text: text_q, labels, values });
  }

  return buildSchema(rows, source, "csv");
}

// ---- JSON ----

function parseJSONCodebook(text: string, source: string): CodebookSchema {
  const data = JSON.parse(text);
  const rows: ParsedRow[] = [];

  if (typeof data === "object" && !Array.isArray(data)) {
    for (const [id, def] of Object.entries(data) as [string, Record<string, unknown>][]) {
      if (def.mapping && typeof def.mapping === "object") {
        const mapping = def.mapping as Record<string, number>;
        rows.push({ id, text: (def.text as string) || "", labels: Object.keys(mapping), values: Object.values(mapping) });
      }
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.id && item.mapping) {
        rows.push({ id: item.id, text: item.text || "", labels: Object.keys(item.mapping), values: Object.values(item.mapping) });
      }
    }
  }

  return buildSchema(rows, source, "json");
}

// ---- SPSS ----

function parseSPSSSyntax(text: string, source: string): CodebookSchema {
  const rows: ParsedRow[] = [];
  const valueLabelRegex = /VALUE\s+LABELS?\s+([\s\S]+?)\/\s*([\s\S]+?)\./gi;
  let match;

  while ((match = valueLabelRegex.exec(text)) !== null) {
    const vars = match[1].trim().split(/\s+/);
    const mappings = match[2].trim();
    const labels: string[] = [];
    const values: number[] = [];
    const pairRegex = /(\d+)\s+"([^"]+)"/g;
    let pairMatch;
    while ((pairMatch = pairRegex.exec(mappings)) !== null) {
      values.push(Number(pairMatch[1]));
      labels.push(pairMatch[2]);
    }

    for (const varName of vars) {
      if (varName && labels.length > 0) {
        rows.push({ id: varName, text: varName, labels: [...labels], values: [...values] });
      }
    }
  }

  return buildSchema(rows, source, "spss");
}

// ---- XLSX ----

async function parseXLSXCodebook(file: File): Promise<CodebookSchema> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedRow[] = [];

  for (const row of json) {
    const rowMap = row as Record<string, string>;
    const id = rowMap["question_id"] || rowMap["id"] || rowMap["变量名"] || rowMap["variable"] || "";
    const text_q = rowMap["question_text"] || rowMap["text"] || rowMap["题目"] || rowMap["label"] || "";
    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 1; i <= 20; i++) {
      const label = rowMap[`label_${i}`] || rowMap[`选项${i}`] || rowMap[`label${i}`];
      const val = rowMap[`value_${i}`] || rowMap[`值${i}`] || rowMap[`value${i}`];
      if (label && val !== undefined) { labels.push(String(label).trim()); values.push(Number(val)); }
    }

    if (labels.length === 0 && rowMap["labels"] && rowMap["values"]) {
      const ls = String(rowMap["labels"]).split(/[,;，；]/).map((s) => s.trim()).filter(Boolean);
      const vs = String(rowMap["values"]).split(/[,;，；]/).map(Number).filter((n) => !isNaN(n));
      if (ls.length === vs.length) { labels.push(...ls); values.push(...vs); }
    }

    if (id && labels.length > 0) rows.push({ id, text: text_q, labels, values });
  }

  return buildSchema(rows, file.name, "csv");
}

// ---- PDF ----

async function parsePDFCodebook(file: File): Promise<CodebookSchema> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  return parsePDFText(fullText, file.name);
}

function parsePDFText(text: string, source: string): CodebookSchema {
  const rows: ParsedRow[] = [];

  // Pattern 1: SPSS-style VALUE LABELS in text
  const valueLabelRegex = /VALUE\s+LABELS?\s+([\s\S]+?)\/\s*([\s\S]+?)\./gi;
  let match;
  while ((match = valueLabelRegex.exec(text)) !== null) {
    const vars = match[1].trim().split(/\s+/);
    const mappings = match[2].trim();
    const labels: string[] = [];
    const values: number[] = [];
    const pairRegex = /(\d+)\s*[=]\s*"([^"]+)"/g;
    let pairMatch;
    while ((pairMatch = pairRegex.exec(mappings)) !== null) {
      values.push(Number(pairMatch[1]));
      labels.push(pairMatch[2]);
    }
    for (const varName of vars) {
      if (varName && labels.length > 0) {
        rows.push({ id: varName, text: varName, labels: [...labels], values: [...values] });
      }
    }
  }

  // Pattern 2: Table-like rows — "Variable  Value  Label" or "Q1  1=Never  2=Sometimes"
  if (rows.length === 0) {
    const lineRegex = /^(\w+)\s+(.+)$/gm;
    const tableRows: string[] = [];
    while ((match = lineRegex.exec(text)) !== null) {
      tableRows.push(match[0]);
    }

    for (const row of tableRows) {
      const pairRegex = /(\d+)\s*[=:：]\s*"([^"]+)"/g;
      const labels: string[] = [];
      const values: number[] = [];
      let pm;
      while ((pm = pairRegex.exec(row)) !== null) {
        values.push(Number(pm[1]));
        labels.push(pm[2]);
      }

      // Also try: 1=Never pattern without quotes
      if (labels.length === 0) {
        const unquotedRegex = /(\d+)\s*=\s*([A-Za-z一-鿿]+)/g;
        while ((pm = unquotedRegex.exec(row)) !== null) {
          values.push(Number(pm[1]));
          labels.push(pm[2]);
        }
      }

      if (labels.length >= 2) {
        const varMatch = /^(\w+)/.exec(row);
        if (varMatch) {
          rows.push({ id: varMatch[1], text: varMatch[1], labels, values });
        }
      }
    }
  }

  // Pattern 3: Free text with variable: value mappings
  if (rows.length === 0) {
    const blockRegex = /(\w+)\s*[:：]\s*\{([^}]+)\}/g;
    while ((match = blockRegex.exec(text)) !== null) {
      const id = match[1];
      const body = match[2];
      const labels: string[] = [];
      const values: number[] = [];
      const pairRegex = /"([^"]+)"\s*:\s*(\d+)/g;
      let pm;
      while ((pm = pairRegex.exec(body)) !== null) {
        labels.push(pm[1]);
        values.push(Number(pm[2]));
      }
      if (labels.length > 0) rows.push({ id, text: id, labels, values });
    }
  }

  return buildSchema(rows, source, "spss");
}

// ---- Markdown ----

function parseMarkdownCodebook(text: string, source: string): CodebookSchema {
  const rows: ParsedRow[] = [];

  // Pattern 1: Markdown table
  // | question_id | text | label_1 | value_1 | label_2 | value_2 | ...
  const tableRegex = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g;
  let match;

  while ((match = tableRegex.exec(text)) !== null) {
    const headerRow = match[1].split("|").map((s) => s.trim()).filter(Boolean);
    const bodyText = match[2];

    for (const line of bodyText.split("\n")) {
      const cells = line.split("|").map((s) => s.trim()).filter(Boolean);
      if (cells.length === 0) continue;

      const row: Record<string, string> = {};
      for (let i = 0; i < headerRow.length && i < cells.length; i++) {
        row[headerRow[i]] = cells[i];
      }

      const id = row["question_id"] || row["id"] || row["变量名"] || row["variable"] || "";
      const text_q = row["question_text"] || row["text"] || row["题目"] || row["label"] || "";
      const labels: string[] = [];
      const values: number[] = [];

      for (let i = 1; i <= 10; i++) {
        const label = row[`label_${i}`] || row[`选项${i}`];
        const val = row[`value_${i}`] || row[`值${i}`];
        if (label && val !== undefined) { labels.push(label.trim()); values.push(Number(val)); }
      }

      if (labels.length === 0 && row["labels"] && row["values"]) {
        const ls = row["labels"].split(",").map((s) => s.trim()).filter(Boolean);
        const vs = row["values"].split(",").map(Number).filter((n) => !isNaN(n));
        if (ls.length === vs.length) { labels.push(...ls); values.push(...vs); }
      }

      if (id && labels.length > 0) rows.push({ id, text: text_q, labels, values });
    }
  }

  // Pattern 2: Key-value style sections
  // ## Q1: Question text
  // - 从不 = 1
  // - 有时 = 3
  // - 总是 = 5
  if (rows.length === 0) {
    const sectionRegex = /(?:^|\n)(?:#{1,3}\s*)?(\w+)\s*[:：]([^\n]*)\n((?:[\s]*[-*]\s*[^\n]+\n?)+)/g;
    while ((match = sectionRegex.exec(text)) !== null) {
      const id = match[1].trim();
      const desc = match[2].trim();
      const kvBlock = match[3];
      const labels: string[] = [];
      const values: number[] = [];

      const kvRegex = /[-*]\s*(.+?)\s*[=：:]\s*(\d+)/g;
      let km;
      while ((km = kvRegex.exec(kvBlock)) !== null) {
        labels.push(km[1].trim());
        values.push(Number(km[2]));
      }

      if (labels.length > 0) rows.push({ id, text: desc || id, labels, values });
    }
  }

  return buildSchema(rows, source, "csv");
}

// ---- Common ----

function buildSchema(rows: ParsedRow[], source: string, sourceType: "csv" | "json" | "spss"): CodebookSchema {
  const questions: Record<string, { id: string; text: string; mapping: Record<string, number>; reverse: boolean; direction: "forward" | "reverse" | "unknown" }> = {};
  const detectedReverse: string[] = [];

  for (const row of rows) {
    const mapping: Record<string, number> = {};
    for (let i = 0; i < row.labels.length; i++) mapping[row.labels[i]] = row.values[i];

    const vals = Object.values(mapping).sort((a, b) => a - b);
    const isReverse = vals.length >= 2 && vals[0] > vals[vals.length - 1];
    if (isReverse) detectedReverse.push(row.id);

    questions[row.id] = { id: row.id, text: row.text, mapping, reverse: isReverse, direction: isReverse ? "reverse" : vals.length > 0 ? "forward" : "unknown" };
  }

  return { questions, source, sourceType, detectedReverseItems: detectedReverse };
}
