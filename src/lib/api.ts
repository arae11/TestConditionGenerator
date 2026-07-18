import type { GenerationOptions, StoryTestResult } from '../types';

export class ApiError extends Error {}

const ENDPOINT = '/.netlify/functions/generate-tests';

/**
 * Calls the Netlify Function that talks to the LLM on the server side.
 * The API key never reaches the browser; this fetch only ever hits our own
 * origin.
 */
export async function generateTestsForStory(
  story: string,
  options: GenerationOptions
): Promise<StoryTestResult> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      story,
      maxTests: options.maxTests,
      includeNonFunctional: options.includeNonFunctional,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new ApiError(payload?.error || `Request failed with status ${response.status}`);
  }

  return payload as StoryTestResult;
}

/**
 * Runs generation for many stories with a bounded concurrency, so we don't
 * fire 50+ simultaneous LLM requests for a large sheet. Calls `onUpdate`
 * after every individual story resolves (success or failure) so the UI can
 * render progress incrementally rather than waiting for the whole batch.
 */
export async function generateTestsForStories(
  stories: { id: string; story: string }[],
  options: GenerationOptions,
  onUpdate: (id: string, result?: StoryTestResult, error?: string) => void,
  concurrency = 3
): Promise<void> {
  let cursor = 0;

  async function worker() {
    while (cursor < stories.length) {
      const index = cursor++;
      const { id, story } = stories[index];
      try {
        const result = await generateTestsForStory(story, options);
        onUpdate(id, result, undefined);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error generating tests.';
        onUpdate(id, undefined, message);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, stories.length) }, () => worker());
  await Promise.all(workers);
}
