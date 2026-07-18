import type { GenerationOptions } from '../types';

interface ControlsProps {
  options: GenerationOptions;
  onChange: (options: GenerationOptions) => void;
  onGenerate: () => void;
  disabled: boolean;
  isGenerating: boolean;
  storyCount: number;
}

export default function Controls({
  options,
  onChange,
  onGenerate,
  disabled,
  isGenerating,
  storyCount,
}: ControlsProps) {
  // The toggle and slider should be locked while a generation run is in
  // flight (changing options mid-run would be confusing), independent of
  // whether the Generate button itself is disabled for other reasons.
  const controlsLocked = isGenerating;

  return (
    <div className="card flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <label
          className={`flex items-center gap-3 ${controlsLocked ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <span className="text-sm font-medium text-ink">Include non-functional tests</span>

          {/* Accessible toggle built on a real checkbox input (visually hidden)
              so disabled/checked states are handled natively by the browser
              instead of being reimplemented by hand. The two spans are purely
              decorative and follow the checkbox's state via the `peer` classes. */}
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              checked={options.includeNonFunctional}
              disabled={controlsLocked}
              onChange={(e) => onChange({ ...options, includeNonFunctional: e.target.checked })}
              aria-label="Include non-functional tests"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-line transition-colors
                peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2
                peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow
                transition-transform peer-checked:translate-x-5"
              aria-hidden="true"
            />
          </span>
        </label>

        <div className={`flex flex-col gap-1 ${controlsLocked ? 'opacity-60' : ''}`}>
          <label htmlFor="max-tests-slider" className="text-sm font-medium text-ink">
            Max test conditions per story: <span className="font-mono text-brand">{options.maxTests}</span>
          </label>
          <input
            id="max-tests-slider"
            type="range"
            min={1}
            max={30}
            step={1}
            value={options.maxTests}
            disabled={controlsLocked}
            onChange={(e) => onChange({ ...options, maxTests: Number(e.target.value) })}
            className="w-56 accent-brand disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <button type="button" className="btn-primary" onClick={onGenerate} disabled={disabled || isGenerating}>
        {isGenerating ? (
          <>
            <Spinner /> Generating…
          </>
        ) : (
          `Generate tests for ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
