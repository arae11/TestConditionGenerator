export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-4">
      <svg className="h-5 w-5 flex-shrink-0 animate-spin text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm font-medium text-ink">{label}</p>
    </div>
  );
}
