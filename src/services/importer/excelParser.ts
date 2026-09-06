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
 * Extracts data from a specific sheet in the workbook
 */
export function extractSheetData(workbook: XLSX.WorkBook, sheetName: string): ExcelSheetData {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { sheetName, headers: [], rows: [] };
  }

  // Convert to array of arrays first to safely extract headers and rows
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    return { sheetName, headers: [], rows: [] };
  }

  const headerRow = (rawData[0] || []).map((h: any) => String(h || '').trim());
  const headers = headerRow.filter((h: string) => h.length > 0);

  const rows: Record<string, any>[] = [];

  for (let r = 1; r < rawData.length; r++) {
    const rowCells = rawData[r] || [];
    const rowObj: Record<string, any> = {};
    let hasAnyData = false;

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const val = rowCells[c] !== undefined ? String(rowCells[c]).trim() : '';
      rowObj[header] = val;
      if (val !== '') hasAnyData = true;
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
