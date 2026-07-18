import * as XLSX from 'xlsx';
import type { ParsedFile, ParsedRow } from '../types';

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export class FileParseError extends Error {}

/**
 * Validates that a File has an accepted extension before we attempt to
 * parse it. This is a fast, cheap check done ahead of the (slightly more
 * expensive) SheetJS parse.
 */
export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Parses a CSV/XLSX/XLS file into a normalized row/column structure.
 * The first non-empty row of the first worksheet is treated as the header
 * row. Every subsequent row is mapped into a ParsedRow keyed by header name.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedFile> {
  if (!isAcceptedFile(file)) {
    throw new FileParseError(
      `Unsupported file type "${file.name}". Please upload a .csv, .xlsx, or .xls file.`
    );
  }

  const buffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new FileParseError(
      `Could not read "${file.name}". The file may be corrupted or is not a valid spreadsheet.`
    );
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new FileParseError(`"${file.name}" does not contain any worksheets.`);
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    throw new FileParseError(`"${file.name}" appears to be empty.`);
  }

  const headerRow = rawRows[0].map((cell) => String(cell ?? '').trim());
  const headers = headerRow.map((h, idx) => (h.length > 0 ? h : `Column ${idx + 1}`));

  const dataRows = rawRows.slice(1);

  const rows: ParsedRow[] = dataRows
    .map((rawRow) => {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = String(rawRow[idx] ?? '').trim();
      });
      return row;
    })
    // Drop rows where every cell is empty (defensive; blankrows:false should
    // already remove most of these, but this also covers rows that only had
    // whitespace).
    .filter((row) => Object.values(row).some((value) => value.length > 0));

  if (rows.length === 0) {
    throw new FileParseError(
      `"${file.name}" has a header row but no data rows. Add at least one user story and try again.`
    );
  }

  return { fileName: file.name, headers, rows };
}
