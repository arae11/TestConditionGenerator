import type { ParsedRow } from '../types';

interface PreviewTableProps {
  headers: string[];
  rows: ParsedRow[];
  selectedColumn: string | null;
  maxRows?: number;
}

export default function PreviewTable({ headers, rows, selectedColumn, maxRows = 6 }: PreviewTableProps) {
  const visibleRows = rows.slice(0, maxRows);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide
                    ${header === selectedColumn ? 'text-brand' : 'text-muted'}`}
                >
                  {header}
                  {header === selectedColumn && (
                    <span className="ml-1.5 rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand-dark">
                      story column
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={idx} className="border-b border-line last:border-0">
                {headers.map((header) => (
                  <td
                    key={header}
                    className={`max-w-xs truncate px-3 py-2 align-top
                      ${header === selectedColumn ? 'font-medium text-ink' : 'text-muted'}`}
                    title={row[header]}
                  >
                    {row[header] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          Showing {maxRows} of {rows.length} rows.
        </p>
      )}
    </div>
  );
}
