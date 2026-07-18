import type { StoryJob } from '../types';

function csvEscape(value: string): string {
  const needsQuoting = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function triggerDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Flattens all completed story jobs into a single CSV: one row per test
 * condition, with the parent story repeated for context.
 */
export function exportResultsToCsv(jobs: StoryJob[], fileName = 'test-conditions.csv') {
  const header = ['Story', 'Test Type', 'Category', 'Title', 'Given', 'When', 'Then'];
  const lines: string[] = [header.join(',')];

  for (const job of jobs) {
    if (job.status !== 'done' || !job.result) continue;
    const { story, functional_tests, non_functional_tests } = job.result;

    for (const test of functional_tests) {
      lines.push(
        [story, 'Functional', '', test.title, test.given, test.when, test.then]
          .map(csvEscape)
          .join(',')
      );
    }
    for (const test of non_functional_tests) {
      lines.push(
        [story, 'Non-functional', test.category, test.title, test.given, test.when, test.then]
          .map(csvEscape)
          .join(',')
      );
    }
  }

  triggerDownload(lines.join('\n'), fileName, 'text/csv;charset=utf-8');
}

/**
 * Renders all completed story jobs as a readable Markdown document, grouped
 * by story with Given/When/Then blocks per test condition.
 */
export function exportResultsToMarkdown(jobs: StoryJob[], fileName = 'test-conditions.md') {
  const sections: string[] = ['# Generated Test Conditions', ''];

  jobs.forEach((job, jobIndex) => {
    if (job.status !== 'done' || !job.result) return;
    const { story, functional_tests, non_functional_tests } = job.result;

    sections.push(`## ${jobIndex + 1}. ${story}`, '');

    if (functional_tests.length > 0) {
      sections.push('### Functional test conditions', '');
      functional_tests.forEach((test, i) => {
        sections.push(
          `**${i + 1}. ${test.title}**`,
          '```gherkin',
          `Given ${test.given}`,
          `When ${test.when}`,
          `Then ${test.then}`,
          '```',
          ''
        );
      });
    }

    if (non_functional_tests.length > 0) {
      sections.push('### Non-functional test conditions', '');
      non_functional_tests.forEach((test, i) => {
        sections.push(
          `**${i + 1}. [${test.category}] ${test.title}**`,
          '```gherkin',
          `Given ${test.given}`,
          `When ${test.when}`,
          `Then ${test.then}`,
          '```',
          ''
        );
      });
    }
  });

  triggerDownload(sections.join('\n'), fileName, 'text/markdown;charset=utf-8');
}

/**
 * Builds a plain-text (copy/paste friendly) rendering of a single story's
 * results, used by the per-card "copy to clipboard" action.
 */
export function formatStoryAsPlainText(job: StoryJob): string {
  if (!job.result) return '';
  const { story, functional_tests, non_functional_tests } = job.result;
  const lines: string[] = [`Story: ${story}`, ''];

  if (functional_tests.length > 0) {
    lines.push('Functional test conditions:', '');
    functional_tests.forEach((test, i) => {
      lines.push(
        `${i + 1}. ${test.title}`,
        `   Given ${test.given}`,
        `   When ${test.when}`,
        `   Then ${test.then}`,
        ''
      );
    });
  }

  if (non_functional_tests.length > 0) {
    lines.push('Non-functional test conditions:', '');
    non_functional_tests.forEach((test, i) => {
      lines.push(
        `${i + 1}. [${test.category}] ${test.title}`,
        `   Given ${test.given}`,
        `   When ${test.when}`,
        `   Then ${test.then}`,
        ''
      );
    });
  }

  return lines.join('\n').trim();
}
