import type { ColumnDetectionResult } from '../types';

interface ColumnSelectorProps {
  headers: string[];
  selectedColumn: string | null;
  detection: ColumnDetectionResult;
  onSelect: (column: string) => void;
}

export default function ColumnSelector({ headers, selectedColumn, detection, onSelect }: ColumnSelectorProps) {
  const isLowConfidence = detection.confidence < 0.55;

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold
            ${isLowConfidence ? 'bg-when-bg text-when' : 'bg-then-bg text-then'}`}
          aria-hidden="true"
        >
          {isLowConfidence ? '!' : '✓'}
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-semibold text-ink">
            {isLowConfidence
              ? "We're not fully sure which column holds the user stories"
              : 'Story column detected'}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {isLowConfidence
              ? 'Pick the correct column below before generating tests.'
              : 'Confirm this is right, or choose a different column.'}
          </p>

          <label htmlFor="story-column-select" className="sr-only">
            User story column
          </label>
          <select
            id="story-column-select"
            value={selectedColumn ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="mt-3 w-full max-w-sm rounded-md border border-line bg-white px-3 py-2 text-sm text-ink
              focus-visible:outline-2 focus-visible:outline-brand"
          >
            <option value="" disabled>
              Select a column…
            </option>
            {headers.map((header) => (
              <option key={header} value={header}>
                {header}
                {detection.candidates.includes(header) ? ' (likely match)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
