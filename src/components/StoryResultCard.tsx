import { useState } from 'react';
import type { GherkinTest, NonFunctionalTest, StoryJob } from '../types';
import {
  buildStoryHtml,
  buildStoryPlainText,
  buildTestHtml,
  buildTestPlainText,
  copyRichText,
  formatGherkinClauses,
} from '../lib/export';

interface StoryResultCardProps {
  job: StoryJob;
  index: number;
}

export default function StoryResultCard({ job, index }: StoryResultCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyStory() {
    if (!job.result) return;
    await copyRichText(buildStoryHtml(job), buildStoryPlainText(job));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const total =
    (job.result?.functional_tests.length ?? 0) + (job.result?.non_functional_tests.length ?? 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-paper px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-light font-mono text-xs font-semibold text-brand-dark">
            {index + 1}
          </span>
          <p className="font-display text-sm font-semibold leading-snug text-ink">{job.story}</p>
        </div>

        {job.status === 'done' && (
          <button
            type="button"
            onClick={handleCopyStory}
            className="btn-secondary flex-shrink-0 !py-1.5 !text-xs"
            title="Copy all test conditions for this story (formatted for Jira)"
          >
            {copied ? 'Copied ✓' : 'Copy all'}
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {job.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-when" />
            Generating test conditions…
          </p>
        )}

        {job.status === 'pending' && <p className="text-sm text-muted">Queued for generation.</p>}

        {job.status === 'error' && (
          <div className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">
            Couldn't generate tests for this story: {job.error}
          </div>
        )}

        {job.status === 'done' && job.result && (
          <div className="flex flex-col gap-4">
            {total === 0 && (
              <p className="text-sm text-muted">
                No test conditions were returned for this story. Try increasing the max test slider.
              </p>
            )}

            {job.result.functional_tests.length > 0 && (
              <TestGroup title="Functional" tests={job.result.functional_tests} />
            )}

            {job.result.non_functional_tests.length > 0 && (
              <TestGroup title="Non-functional" tests={job.result.non_functional_tests} showCategory />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TestGroupProps {
  title: string;
  tests: GherkinTest[] | NonFunctionalTest[];
  showCategory?: boolean;
}

function TestGroup({ title, tests, showCategory }: TestGroupProps) {
  return (
    <div>
      <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted">
        {title} ({tests.length})
      </p>
      <ol className="flex flex-col gap-3">
        {tests.map((test, i) => (
          <TestConditionItem key={i} index={i} test={test} showCategory={showCategory} />
        ))}
      </ol>
    </div>
  );
}

interface TestConditionItemProps {
  index: number;
  test: GherkinTest | NonFunctionalTest;
  showCategory?: boolean;
}

function TestConditionItem({ index, test, showCategory }: TestConditionItemProps) {
  const [copied, setCopied] = useState(false);
  const { given, when, then } = formatGherkinClauses(test);
  const category = (test as NonFunctionalTest).category;

  async function handleCopy() {
    await copyRichText(buildTestHtml(test), buildTestPlainText(test));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="rounded-md border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-1.5">
        <span className="font-mono text-xs text-muted">#{index + 1}</span>
        <span className="text-sm font-medium text-ink">{test.title}</span>
        {showCategory && category && (
          <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
            {category}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="btn-secondary ml-auto !py-1 !px-2 !text-[11px]"
          title="Copy this test condition (formatted for Jira)"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="gwt-line bg-given-bg text-given">
          <span className="font-semibold">Given</span>
          <span className="text-ink/90">{given}</span>
        </div>
        <div className="gwt-line bg-when-bg text-when">
          <span className="font-semibold">When</span>
          <span className="text-ink/90">{when}</span>
        </div>
        <div className="gwt-line bg-then-bg text-then">
          <span className="font-semibold">Then</span>
          <span className="text-ink/90">{then}</span>
        </div>
      </div>
    </li>
  );
}
