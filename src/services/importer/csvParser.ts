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

  // 1. Scan for the best header row within the first 10 rows
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, '');

  const KEYWORDS = ['cauhoi', 'cau', 'noidung', 'question', 'dapan', 'phuongan', 'option', 'stt', 'order', 'a', 'b', 'c', 'd', 'giaithich', 'diem'];

  let bestHeaderRowIndex = 0;
  let maxScore = -1;
  const maxScanRows = Math.min(rawRows.length, 10);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    let matchCount = 0;
    let nonBlank = 0;
    for (const cell of row) {
      const clean = cell.replace(/^["']|["']$/g, '').trim();
      if (clean) {
        nonBlank++;
        const norm = normalize(clean);
        if (norm === 'a' || norm === 'b' || norm === 'c' || norm === 'd' ||
            KEYWORDS.some((kw) => norm === kw || norm.startsWith(kw) || norm.includes(kw))) {
          matchCount++;
        }
      }
    }
    if (nonBlank >= 2) {
      const score = matchCount * 2 + nonBlank;
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRowIndex = r;
      }
    }
  }

  const rawHeaderRow = rawRows[bestHeaderRowIndex] || [];
  const alignedHeaders: { name: string; colIndex: number }[] = [];
  const seenHeaders = new Map<string, number>();

  for (let c = 0; c < rawHeaderRow.length; c++) {
    let header = rawHeaderRow[c].replace(/^["']|["']$/g, '').trim();
    if (!header) continue;

    const lower = header.toLowerCase();
    const count = seenHeaders.get(lower) || 0;
    seenHeaders.set(lower, count + 1);
    if (count > 0) {
      header = `${header}_${count + 1}`;
    }

    alignedHeaders.push({ name: header, colIndex: c });
  }

  const rawHeaders = alignedHeaders.map((h) => h.name);
  const rows: Record<string, string>[] = [];

  for (let r = bestHeaderRowIndex + 1; r < rawRows.length; r++) {
    const rowCells = rawRows[r];
    const obj: Record<string, string> = {};
    let hasAnyData = false;

    for (const { name, colIndex } of alignedHeaders) {
      const val = rowCells[colIndex] !== undefined ? rowCells[colIndex].replace(/^["']|["']$/g, '').trim() : '';
      obj[name] = val;
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
