import type { GherkinTest, StoryJob } from '../types';

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

// -----------------------------------------------------------------------------
// Gherkin line formatting
//
// House style for a single test condition, used consistently on-screen and in
// every copy/export path: "Given <clause>," / "When <clause>," /
// "Then <clause>." — Given/When/Then bolded, Given and When lines end with a
// comma, Then ends with a full stop. The model's raw clauses sometimes come
// back with their own trailing punctuation, so we strip that first to avoid
// doubling up (e.g. "...submitted.," or "...submitted..").
// -----------------------------------------------------------------------------

/** Strips any trailing punctuation/whitespace so we can apply our own. */
export function normalizeClause(text: string): string {
  return text.trim().replace(/[.,;:]+$/, '').trim();
}

/** Returns the given/when/then clauses with house-style punctuation applied. */
export function formatGherkinClauses(test: GherkinTest): { given: string; when: string; then: string } {
  return {
    given: `${normalizeClause(test.given)},`,
    when: `${normalizeClause(test.when)},`,
    then: `${normalizeClause(test.then)}.`,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Plain-text rendering of one test condition, e.g. for the clipboard fallback. */
export function buildTestPlainText(test: GherkinTest): string {
  const { given, when, then } = formatGherkinClauses(test);
  return `Given ${given}\nWhen ${when}\nThen ${then}`;
}

/**
 * Rich-text (HTML) rendering of one test condition with Given/When/Then
 * bolded. Pasting this into Jira (or any rich-text editor) preserves the
 * bold formatting, unlike a plain-text clipboard write.
 */
export function buildTestHtml(test: GherkinTest): string {
  const { given, when, then } = formatGherkinClauses(test);
  return (
    `<p>` +
    `<b>Given</b> ${escapeHtml(given)}<br>` +
    `<b>When</b> ${escapeHtml(when)}<br>` +
    `<b>Then</b> ${escapeHtml(then)}` +
    `</p>`
  );
}

/**
 * Writes both an HTML and a plain-text representation to the clipboard so
 * rich-text targets (Jira, Confluence, Google Docs, Word) preserve bold
 * formatting on paste, while plain-text targets (a terminal, a .txt file)
 * still get a sensible fallback.
 */
export async function copyRichText(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }
  // Fallback for browsers without ClipboardItem/ClipboardEvent write support.
  await navigator.clipboard.writeText(plainText);
}

/**
 * Flattens all completed story jobs into a single CSV: one row per test
 * condition, with the parent story repeated for context. Clauses are left
 * unpunctuated here (rather than house-styled) since CSV cells are typically
 * consumed by other tooling, not read as prose.
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
 * by story, using the same house-style Given/When/Then formatting as the
 * on-screen cards and the per-condition copy buttons.
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
        const { given, when, then } = formatGherkinClauses(test);
        sections.push(`**${i + 1}. ${test.title}**`, '', `**Given** ${given}`, `**When** ${when}`, `**Then** ${then}`, '');
      });
    }

    if (non_functional_tests.length > 0) {
      sections.push('### Non-functional test conditions', '');
      non_functional_tests.forEach((test, i) => {
        const { given, when, then } = formatGherkinClauses(test);
        sections.push(
          `**${i + 1}. [${test.category}] ${test.title}**`,
          '',
          `**Given** ${given}`,
          `**When** ${when}`,
          `**Then** ${then}`,
          ''
        );
      });
    }
  });

  triggerDownload(sections.join('\n'), fileName, 'text/markdown;charset=utf-8');
}

/**
 * Builds a plain-text rendering of an entire story's results (all of its
 * test conditions), used as the clipboard fallback for the per-story copy
 * button.
 */
export function buildStoryPlainText(job: StoryJob): string {
  if (!job.result) return '';
  const { story, functional_tests, non_functional_tests } = job.result;
  const lines: string[] = [`Story: ${story}`, ''];

  if (functional_tests.length > 0) {
    lines.push('Functional test conditions:', '');
    functional_tests.forEach((test, i) => {
      const { given, when, then } = formatGherkinClauses(test);
      lines.push(`${i + 1}. ${test.title}`, `   Given ${given}`, `   When ${when}`, `   Then ${then}`, '');
    });
  }

  if (non_functional_tests.length > 0) {
    lines.push('Non-functional test conditions:', '');
    non_functional_tests.forEach((test, i) => {
      const { given, when, then } = formatGherkinClauses(test);
      lines.push(
        `${i + 1}. [${test.category}] ${test.title}`,
        `   Given ${given}`,
        `   When ${when}`,
        `   Then ${then}`,
        ''
      );
    });
  }

  return lines.join('\n').trim();
}

/**
 * Builds the HTML counterpart to `buildStoryPlainText`, with Given/When/Then
 * bolded per test condition — this is what actually preserves formatting
 * when pasted into Jira.
 */
export function buildStoryHtml(job: StoryJob): string {
  if (!job.result) return '';
  const { story, functional_tests, non_functional_tests } = job.result;
  const parts: string[] = [`<p><b>Story:</b> ${escapeHtml(story)}</p>`];

  const renderGroup = (title: string, tests: GherkinTest[], withCategory: boolean) => {
    if (tests.length === 0) return;
    parts.push(`<p><b>${escapeHtml(title)}</b></p>`);
    tests.forEach((test, i) => {
      const { given, when, then } = formatGherkinClauses(test);
      const category = withCategory ? ` [${escapeHtml((test as GherkinTest & { category?: string }).category ?? '')}]` : '';
      parts.push(
        `<p>${i + 1}.${category} ${escapeHtml(test.title)}<br>` +
          `<b>Given</b> ${escapeHtml(given)}<br>` +
          `<b>When</b> ${escapeHtml(when)}<br>` +
          `<b>Then</b> ${escapeHtml(then)}</p>`
      );
    });
  };

  renderGroup('Functional test conditions:', functional_tests, false);
  renderGroup('Non-functional test conditions:', non_functional_tests, true);

  return parts.join('\n');
}
