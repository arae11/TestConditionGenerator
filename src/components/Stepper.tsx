interface StepperProps {
  currentStep: number; // 1-indexed
}

const STEPS = ['Upload', 'Map column', 'Configure', 'Review'];

// Styled for the dark navy header banner it lives in.
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
                ${state === 'active' ? 'bg-white text-navy ring-2 ring-brand' : ''}
                ${state === 'upcoming' ? 'bg-white/10 text-white/50' : ''}`}
            >
              {state === 'done' ? '✓' : stepNum}
            </span>
            <span
              className={`hidden text-sm font-medium sm:inline
                ${state === 'upcoming' ? 'text-white/50' : 'text-white'}`}
            >
              {label}
            </span>
            {idx < STEPS.length - 1 && <span className="h-px w-4 bg-white/20 sm:w-8" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
