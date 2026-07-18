interface StepperProps {
  currentStep: number; // 1-indexed
}

const STEPS = ['Upload', 'Map column', 'Configure', 'Review'];

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const state = stepNum < currentStep ? 'done' : stepNum === currentStep ? 'active' : 'upcoming';
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold
                ${state === 'done' ? 'bg-brand text-white' : ''}
                ${state === 'active' ? 'bg-brand-light text-brand-dark ring-2 ring-brand' : ''}
                ${state === 'upcoming' ? 'bg-line text-muted' : ''}`}
            >
              {state === 'done' ? '✓' : stepNum}
            </span>
            <span
              className={`hidden text-sm font-medium sm:inline
                ${state === 'upcoming' ? 'text-muted' : 'text-ink'}`}
            >
              {label}
            </span>
            {idx < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
