interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
      <p className="text-sm text-warn">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="flex-shrink-0 text-warn/80 hover:text-warn"
      >
        ✕
      </button>
    </div>
  );
}
