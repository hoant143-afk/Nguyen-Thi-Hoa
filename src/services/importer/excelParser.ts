import * as XLSX from 'xlsx';

export interface ExcelWorkbookInfo {
  sheetNames: string[];
  activeSheet: string;
}

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
}

/**
 * Reads an Excel file buffer (.xlsx, .xls) and returns available sheets
 */
export function readExcelWorkbook(data: ArrayBuffer): {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
} {
  const workbook = XLSX.read(data, {
    type: 'array',
    cellFormula: false,
    cellHTML: false,
    raw: false, // get formatted text representation
  });

  return {
    workbook,
    sheetNames: workbook.SheetNames || [],
  };
}

/**
 * Normalizes text to help detect header rows
 */
function normalizeText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Common keywords found in question spreadsheet headers
 */
const HEADER_KEYWORDS = [
  'cauhoi', 'cau', 'noidung', 'question', 'debai',
  'dapandung', 'dapan', 'cautraloi', 'key', 'answer',
  'dapana', 'phuongana', 'optiona', 'luachona',
  'dapanb', 'phuonganb', 'optionb', 'luachonb',
  'dapanc', 'phuonganc', 'optionc', 'luachonc',
  'dapand', 'phuongand', 'optiond', 'luachond',
  'stt', 'order', 'thutu',
  'giaithich', 'huongdan', 'loigiai', 'explanation',
  'chude', 'topic', 'bai', 'mon', 'monhoc', 'subject',
  'khoi', 'lop', 'grade',
  'diem', 'points', 'dokho', 'difficulty',
];

/**
 * Extracts data from a specific sheet in the workbook
 * Uses smart header detection to skip top title banners/empty rows and
 * maps cell indices reliably to avoid column offset bugs.
 */
export function extractSheetData(workbook: XLSX.WorkBook, sheetName: string): ExcelSheetData {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { sheetName, headers: [], rows: [] };
  }

  // Convert to array of arrays first
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    return { sheetName, headers: [], rows: [] };
  }

  // 1. Find the best header row within the first 20 rows
  let bestHeaderRowIndex = 0;
  let maxScore = -1;
  const maxScanRows = Math.min(rawData.length, 20);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rawData[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let matchCount = 0;
    let nonBlankCells = 0;

    for (const cell of row) {
      const cellStr = String(cell || '').trim();
      if (cellStr.length > 0) {
        nonBlankCells++;
        const norm = normalizeText(cellStr);
        if (norm === 'a' || norm === 'b' || norm === 'c' || norm === 'd' ||
            norm === '1' || norm === '2' || norm === '3' || norm === '4' ||
            HEADER_KEYWORDS.some((kw) => norm === kw || norm.startsWith(kw) || norm.includes(kw))) {
          matchCount++;
        }
      }
    }

    // Require at least 2 non-blank cells
    if (nonBlankCells >= 2) {
      const score = matchCount * 2 + nonBlankCells;
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRowIndex = r;
      }
    }
  }

  // If no good match, find the first row with at least 2 non-empty cells
  if (maxScore < 2) {
    for (let r = 0; r < maxScanRows; r++) {
      const row = rawData[r];
      if (Array.isArray(row) && row.filter((c) => String(c || '').trim().length > 0).length >= 2) {
        bestHeaderRowIndex = r;
        break;
      }
    }
  }

  const rawHeaderRow = rawData[bestHeaderRowIndex] || [];

  // 2. Build aligned headers with their exact column indices
  interface HeaderCol {
    name: string;
    colIndex: number;
  }
  const alignedHeaders: HeaderCol[] = [];
  const seenHeaderNames = new Map<string, number>();

  for (let c = 0; c < rawHeaderRow.length; c++) {
    const rawVal = rawHeaderRow[c];
    let headerName = String(rawVal ?? '').trim();
    if (!headerName) {
      // If blank column header, skip or generate a unique column placeholder only if subsequent data exists
      continue;
    }

    // Deduplicate identical header names (e.g. multiple "Đáp án")
    const lowerName = headerName.toLowerCase();
    const count = seenHeaderNames.get(lowerName) || 0;
    seenHeaderNames.set(lowerName, count + 1);

    if (count > 0) {
      headerName = `${headerName}_${count + 1}`;
    }

    alignedHeaders.push({
      name: headerName,
      colIndex: c,
    });
  }

  // If no headers were found, return empty
  if (alignedHeaders.length === 0) {
    return { sheetName, headers: [], rows: [] };
  }

  const headers = alignedHeaders.map((h) => h.name);
  const rows: Record<string, any>[] = [];

  // 3. Extract data rows below the detected header row
  for (let r = bestHeaderRowIndex + 1; r < rawData.length; r++) {
    const rowCells = rawData[r];
    if (!Array.isArray(rowCells) || rowCells.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasAnyData = false;

    for (const { name, colIndex } of alignedHeaders) {
      const rawCell = rowCells[colIndex];
      let val = '';
      if (rawCell !== undefined && rawCell !== null) {
        val = String(rawCell).trim();
      }
      rowObj[name] = val;
      if (val !== '') {
        hasAnyData = true;
      }
    }

    if (hasAnyData) {
      rows.push(rowObj);
    }
  }

  return {
    sheetName,
    headers,
    rows,
  };
}
