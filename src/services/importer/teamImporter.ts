import * as XLSX from 'xlsx';
import { TeamImportItem } from './types';
import { normalizeHeaderKey } from './questionImporter';

const DEFAULT_BADGES = ['🔵', '🟠', '🟢', '🟣', '🔴', '🟡', '⚡', '🚀', '🐯', '🐉', '🦅', '💎'];
const FALLBACK_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#f59e0b'];

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Parses raw team rows from CSV or Excel into TeamImportItem
 */
export function parseTeamRows(rows: Record<string, any>[]): TeamImportItem[] {
  if (!rows || rows.length === 0) return [];

  // Detect column mapping for teams
  const sample = rows[0];
  const headers = Object.keys(sample);

  let nameCol = '';
  let colorCol = '';
  let badgeCol = '';

  for (const h of headers) {
    const norm = normalizeHeaderKey(h);
    if (!nameCol && (norm.includes('name') || norm.includes('tendoi') || norm.includes('doi') || norm.includes('team'))) {
      nameCol = h;
    } else if (!colorCol && (norm.includes('color') || norm.includes('mau') || norm.includes('mamau'))) {
      colorCol = h;
    } else if (!badgeCol && (norm.includes('badge') || norm.includes('icon') || norm.includes('bieutuong'))) {
      badgeCol = h;
    }
  }

  // Fallback if headers not found by keywords
  if (!nameCol && headers.length > 0) nameCol = headers[0];
  if (!colorCol && headers.length > 1) colorCol = headers[1];

  const teams: TeamImportItem[] = [];

  rows.forEach((r, idx) => {
    const rawName = nameCol ? String(r[nameCol] || '').trim() : '';
    const rawColor = colorCol ? String(r[colorCol] || '').trim() : '';
    const rawBadge = badgeCol ? String(r[badgeCol] || '').trim() : '';

    if (!rawName) return; // skip empty rows

    let validColor = rawColor;
    let isValid = true;
    let error: string | undefined;

    if (!validColor || !isValidHexColor(validColor)) {
      validColor = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      if (rawColor && !isValidHexColor(rawColor)) {
        error = `Mã màu "${rawColor}" không đúng chuẩn Hex, tự động thay thế bằng ${validColor}`;
      }
    }

    const badge = rawBadge || DEFAULT_BADGES[idx % DEFAULT_BADGES.length];

    teams.push({
      id: `imported_team_${idx + 1}_${Date.now()}`,
      teamName: rawName.toUpperCase(),
      teamColor: validColor,
      badge,
      selected: idx < 4, // by default select up to 4 teams
      isValid,
      error,
    });
  });

  return teams;
}

/**
 * Generate CSV template for Teams
 */
export function generateTeamCsvTemplate(): string {
  const content = [
    'teamName,teamColor',
    'Sao Xanh,#2563EB',
    'Tia Chớp,#F97316',
    'Siêu Việt,#22C55E',
    'Chiến Binh,#9333EA',
  ].join('\r\n');

  return '\uFEFF' + content;
}

/**
 * Generate Excel .xlsx template for Teams
 */
export function generateTeamExcelTemplate(): Uint8Array {
  const data = [
    { teamName: 'Sao Xanh', teamColor: '#2563EB' },
    { teamName: 'Tia Chớp', teamColor: '#F97316' },
    { teamName: 'Siêu Việt', teamColor: '#22C55E' },
    { teamName: 'Chiến Binh', teamColor: '#9333EA' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Đội');

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
