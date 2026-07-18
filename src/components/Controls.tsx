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
  return (
    <div className="card flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <label className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">Include non-functional tests</span>
          <button
            type="button"
            role="switch"
            aria-checked={options.includeNonFunctional}
            onClick={() => onChange({ ...options, includeNonFunctional: !options.includeNonFunctional })}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors
              ${options.includeNonFunctional ? 'bg-brand' : 'bg-line'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                ${options.includeNonFunctional ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </label>

        <div className="flex flex-col gap-1">
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
            onChange={(e) => onChange({ ...options, maxTests: Number(e.target.value) })}
            className="w-56 accent-brand"
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
