export default function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand">
          <path
            d="M9 12h6m-6 4h6m-9 4h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H9.5a1 1 0 0 0-.7.3L4.3 8.8a1 1 0 0 0-.3.7V18a2 2 0 0 0 2 2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="font-display text-base font-semibold text-ink">No test conditions yet</p>
      <p className="max-w-sm text-sm text-muted">
        Upload a spreadsheet of user stories above to get started. Each story should follow the
        "As a … I want … so that …" shape, but close variants work too.
      </p>
    </div>
  );
}
