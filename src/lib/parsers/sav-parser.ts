// ============================================================
// SPSS .sav Binary Parser (browser-compatible)
// Parses common .sav format produced by SPSS 16+
// Reference: https://github.com/t3rmian/pspp-sheet
// ============================================================

interface SavHeader {
  varNames: string[];
  varTypes: number[];
  varLabels: string[];
  valueLabels: Map<string, string>[];
  caseSize: number;
  caseCount: number;
}

interface SavResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  colCount: number;
  fileName: string;
}

export async function parseSavFile(file: File, fileName: string): Promise<SavResult> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Verify magic: "$FL2" or "$FL3"
  const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
  if (magic !== "$FL2" && magic !== "$FL3") {
    throw new Error("不是有效的 SPSS .sav 文件（文件头不匹配）");
  }

  const header = readHeader(data, view);
  const rows = readData(data, header);

  return {
    headers: header.varNames,
    rows: rows.slice(0, 10000), // Limit to 10k rows for browser safety
    rowCount: rows.length,
    colCount: header.varNames.length,
    fileName,
  };
}

function readHeader(data: Uint8Array, view: DataView): SavHeader {
  let pos = 4; // skip magic

  // Skip product name (60 bytes)
  pos += 60;
  // Layout code
  pos += 4;
  // Nominal case size
  const nominalCaseSize = view.getInt32(pos, true); pos += 4;
  // Compression switch
  pos += 4;

  // Skip weight variable, cases, bias
  pos += 4 + 4 + 8 + 8;

  // Skip creation date (9 bytes), time (8 bytes)
  pos += 9 + 8;
  // File label (64 bytes)
  pos += 64;
  // Padding (3 bytes)
  pos += 3;

  // Variable records
  const varNames: string[] = [];
  const varTypes: number[] = [];
  const varLabels: string[] = [];
  const valueLabels: Map<string, string>[] = [];

  while (pos < data.length) {
    const recordType = view.getInt32(pos, true); pos += 4;
    if (recordType === -1) break; // variable records end
    if (recordType !== 2) {
      // Skip unknown record type
      pos += 4;
      continue;
    }

    const typeCode = view.getInt32(pos, true); pos += 4;
    const hasLabel = view.getInt32(pos, true); pos += 4;

    // Missing value format code + count
    pos += 4 + 4;

    // Print format + Write format
    pos += 8 + 8;

    // Variable name (8 bytes, padded with spaces)
    const nameBytes = data.slice(pos, pos + 8);
    pos += 8;
    let varName = "";
    for (let i = 0; i < 8; i++) {
      const c = nameBytes[i];
      if (c === 0x20 || c === 0) break; // space or null = end
      varName += String.fromCharCode(c);
    }
    if (!varName) varName = `V${varNames.length + 1}`;
    varNames.push(varName);
    varTypes.push(typeCode);

    // Variable label
    let label = "";
    if (hasLabel === 1) {
      // Skip label length and read variable-length label
      const labelLen = view.getInt32(pos, true); pos += 4;
      // Label is rounded to 4-byte boundary
      const paddedLen = Math.ceil(labelLen / 4) * 4;
      const labelBytes = data.slice(pos, pos + labelLen);
      pos += paddedLen;
      label = new TextDecoder().decode(labelBytes).replace(/\0/g, "").trim();
    }
    varLabels.push(label || varName);

    // Missing values
    const nMissing = view.getInt32(pos, true); pos += 4;
    if (nMissing > 0) pos += nMissing * 8; // skip missing value doubles

    // Value labels — collected later, simplified for now
    valueLabels.push(new Map());
  }

  // Skip info records until type 999
  while (pos < data.length) {
    const recType = view.getInt32(pos, true);
    if (recType === 999) { pos += 4; break; }
    const subType = view.getInt32(pos + 4, true);
    const recSize = view.getInt32(pos + 8, true);
    pos += 12 + recSize;
  }

  // Value label records
  while (pos + 8 < data.length) {
    const recType = view.getInt32(pos, true); pos += 4;
    if (recType !== 3) break;

    const count = view.getInt32(pos, true); pos += 4;
    for (let i = 0; i < count; i++) {
      const val = view.getFloat64(pos, true); pos += 8;
      const labelLen = data[pos]; pos += 1;
      const labelBytes = data.slice(pos, pos + Math.min(labelLen, 120));
      pos += Math.ceil((labelLen + 1) / 8) * 8;
      const labelStr = new TextDecoder().decode(labelBytes).replace(/\0/g, "").trim();
      // Store value label — simplified, not used for display
    }
  }

  // Data records — skip to data start
  // Find compression bias
  const compBias = view.getFloat64(pos, true); pos += 8;
  const caseSize = nominalCaseSize;

  return {
    varNames,
    varTypes,
    varLabels,
    valueLabels,
    caseSize,
    caseCount: 0,
  };
}

function readData(data: Uint8Array, header: SavHeader): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const { varNames, varTypes, caseSize } = header;

  // Find data start — look for compression bias marker (0.0 as double = 8 zero bytes)
  let pos = 0;
  // Simple heuristic: scan for 8 consecutive zeros after header area
  // Then the data follows each case
  // For simplicity, find a string "00000000" that's likely the bias marker
  const start = findDataStart(data);
  if (start < 0) return rows;

  pos = start + 8; // skip bias

  // Read cases
  const maxRows = 10000;
  const decoder = new TextDecoder();

  while (pos < data.length && rows.length < maxRows) {
    const row: Record<string, string> = {};
    let casePos = pos;

    for (let vi = 0; vi < varNames.length; vi++) {
      if (casePos + 8 > data.length) break;
      const value = data.slice(casePos, casePos + 8);

      // Check if it's a string (type > 0 means string with width = type)
      const width = varTypes[vi];
      if (width > 0) {
        const strBytes = value.slice(0, width);
        const str = decoder.decode(strBytes).replace(/\0/g, "").trim();
        row[varNames[vi]] = str || "";
        casePos += 8; // each value occupies 8 bytes
      } else {
        // Numeric — read as double
        const dv = new DataView(value.buffer, value.byteOffset, 8);
        // Check for system missing (-Infinity or very large negative)
        const raw = dv.getFloat64(0, true);
        if (raw < -1e100) {
          row[varNames[vi]] = "";
        } else {
          // Format based on precision
          const absVal = Math.abs(raw);
          if (absVal < 1e-10) {
            row[varNames[vi]] = "0";
          } else if (absVal >= 100 || absVal < 0.01) {
            row[varNames[vi]] = raw.toFixed(3);
          } else {
            row[varNames[vi]] = raw.toFixed(2);
          }
        }
        casePos += 8;
      }
    }

    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
    pos = casePos;
  }

  return rows;
}

function findDataStart(data: Uint8Array): number {
  // Search for the last "00000000" pattern (8 zero bytes = compensation bias = 0.0)
  for (let i = Math.max(0, data.length - 100000); i < data.length - 8; i++) {
    let allZero = true;
    for (let j = 0; j < 8; j++) {
      if (data[i + j] !== 0) { allZero = false; break; }
    }
    if (allZero) return i;
  }
  return -1;
}
