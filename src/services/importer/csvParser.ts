/**
 * Robust CSV Parser for Vietnamese text, supporting UTF-8, BOM,
 * custom/auto-detected delimiters (comma, semicolon, tab),
 * and quoted multi-line content.
 */

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  detectedDelimiter: string;
}

/**
 * Detect delimiter by counting frequency in first non-empty lines
 */
export function detectDelimiter(text: string): string {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const firstLine = clean.split(/\r?\n/)[0] || '';

  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Parses CSV raw string taking into account quotes, escaped quotes,
 * commas/semicolons, and multiline cells.
 */
export function parseCsv(text: string, customDelimiter?: string): ParsedCsvResult {
  // Strip UTF-8 BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');
  const delimiter = customDelimiter || detectDelimiter(cleanText);

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // End of quoted cell
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c !== '')) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c !== '')) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
      }
    }
  }

  // Push remainder if exists
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) {
    return { headers: [], rows: [], detectedDelimiter: delimiter };
  }

  const rawHeaders = rawRows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const rowCells = rawRows[r];
    const obj: Record<string, string> = {};
    let hasAnyData = false;

    for (let c = 0; c < rawHeaders.length; c++) {
      const header = rawHeaders[c] || `Cột_${c + 1}`;
      const val = rowCells[c] !== undefined ? rowCells[c].replace(/^["']|["']$/g, '').trim() : '';
      obj[header] = val;
      if (val !== '') hasAnyData = true;
    }

    if (hasAnyData) {
      rows.push(obj);
    }
  }

  return {
    headers: rawHeaders,
    rows,
    detectedDelimiter: delimiter,
  };
}
