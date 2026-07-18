import type { StoryJob } from '../types';
import StoryResultCard from './StoryResultCard';
import { exportResultsToCsv, exportResultsToMarkdown } from '../lib/export';

interface ResultsViewProps {
  jobs: StoryJob[];
}

export default function ResultsView({ jobs }: ResultsViewProps) {
  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const errorCount = jobs.filter((j) => j.status === 'error').length;
  const hasAnyDone = doneCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {doneCount} of {jobs.length} stories complete
          {errorCount > 0 && <span className="text-warn"> · {errorCount} failed</span>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={!hasAnyDone}
            onClick={() => exportResultsToCsv(jobs)}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!hasAnyDone}
            onClick={() => exportResultsToMarkdown(jobs)}
          >
            Export Markdown
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {jobs.map((job, idx) => (
          <StoryResultCard key={job.id} job={job} index={idx} />
        ))}
      </div>
    </div>
  );
}
