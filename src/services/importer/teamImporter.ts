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
  if (!rows || rows.length === 0) {
    throw new Error('❌ File không có dữ liệu đội.');
  }

  // Detect column mapping for teams
  const sample = rows[0];
  const headers = Object.keys(sample);

  let nameCol = '';
  let colorCol = '';
  let markerColorCol = '';
  let badgeCol = '';

  for (const h of headers) {
    const norm = normalizeHeaderKey(h);
    if (!nameCol && (norm.includes('teamname') || norm.includes('tendoi') || norm.includes('namedoi') || norm === 'team' || norm === 'name' || norm.includes('ten') || norm.includes('doi'))) {
      nameCol = h;
    } else if (!colorCol && (norm.includes('teamcolor') || norm.includes('maudoi') || norm.includes('color') || norm.includes('mamau') || norm.includes('mau'))) {
      colorCol = h;
    } else if (!markerColorCol && (norm.includes('markercolor') || norm.includes('mauthe') || norm.includes('cardcolor') || norm.includes('the') || norm.includes('marker'))) {
      markerColorCol = h;
    } else if (!badgeCol && (norm.includes('badge') || norm.includes('icon') || norm.includes('bieutuong') || norm.includes('hieu'))) {
      badgeCol = h;
    }
  }

  if (!nameCol) {
    throw new Error('❌ File không có cột teamName.');
  }

  const teams: TeamImportItem[] = [];

  rows.forEach((r, idx) => {
    const rawName = nameCol ? String(r[nameCol] || '').trim() : '';
    const rawColor = colorCol ? String(r[colorCol] || '').trim() : '';
    const rawMarkerColor = markerColorCol ? String(r[markerColorCol] || '').trim() : '';
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

    let validMarkerColor = rawMarkerColor;
    if (!validMarkerColor || !isValidHexColor(validMarkerColor)) {
      validMarkerColor = validColor;
    }

    const badge = rawBadge || DEFAULT_BADGES[idx % DEFAULT_BADGES.length];

    teams.push({
      id: `imported_team_${idx + 1}_${Date.now()}`,
      teamName: rawName.toUpperCase(),
      teamColor: validColor,
      markerColor: validMarkerColor,
      badge,
      selected: idx < 4, // by default select up to 4 teams
      isValid,
      error,
    });
  });

  if (teams.length === 0) {
    throw new Error('❌ File không có dữ liệu đội.');
  }

  return teams;
}

/**
 * Generate CSV template for Teams
 */
export function generateTeamCsvTemplate(): string {
  const content = [
    'teamName,teamColor,markerColor',
    'Đội Tia Chớp,#2563EB,#2563EB',
    'Đội Mặt Trời,#F97316,#F97316',
    'Đội Siêu Việt,#22C55E,#22C55E',
    'Đội Chiến Binh,#9333EA,#9333EA',
  ].join('\r\n');

  return '\uFEFF' + content;
}

/**
 * Generate Excel .xlsx template for Teams
 */
export function generateTeamExcelTemplate(): Uint8Array {
  const data = [
    { teamName: 'Đội Tia Chớp', teamColor: '#2563EB', markerColor: '#2563EB' },
    { teamName: 'Đội Mặt Trời', teamColor: '#F97316', markerColor: '#F97316' },
    { teamName: 'Đội Siêu Việt', teamColor: '#22C55E', markerColor: '#22C55E' },
    { teamName: 'Đội Chiến Binh', teamColor: '#9333EA', markerColor: '#9333EA' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Đội');

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
