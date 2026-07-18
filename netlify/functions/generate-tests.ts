import type { Handler, HandlerEvent } from '@netlify/functions';

// -----------------------------------------------------------------------------
// Configuration
//
// Uses Google's Gemini API, which has a permanent free tier (no credit card,
// no expiry) generous enough for this app: as of mid-2026, roughly 1,500
// requests/day and 1M tokens/minute on Gemini 2.5 Flash via Google AI Studio.
// Get a key at https://aistudio.google.com/apikey and set it as GEMINI_API_KEY
// in your Netlify environment variables.
// -----------------------------------------------------------------------------

const GEMINI_MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

const MAX_STORY_LENGTH = 2000;

const NON_FUNCTIONAL_CATEGORIES = [
  'performance',
  'accessibility',
  'security',
  'reliability',
  'usability',
  'compatibility',
  'error handling',
  'resilience',
] as const;

interface RequestBody {
  story: string;
  maxTests: number;
  includeNonFunctional: boolean;
}

interface GherkinTest {
  title: string;
  given: string;
  when: string;
  then: string;
}

interface NonFunctionalTest extends GherkinTest {
  category: string;
}

interface StoryTestResult {
  story: string;
  functional_tests: GherkinTest[];
  non_functional_tests: NonFunctionalTest[];
}

// Gemini "controlled generation" schema. Passing this alongside
// responseMimeType: "application/json" makes Gemini's output conform to this
// shape directly, which is far more reliable than asking nicely in the
// prompt and hoping for valid JSON back.
const GHERKIN_TEST_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    given: { type: 'STRING' },
    when: { type: 'STRING' },
    then: { type: 'STRING' },
  },
  required: ['title', 'given', 'when', 'then'],
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    functional_tests: { type: 'ARRAY', items: GHERKIN_TEST_SCHEMA },
    non_functional_tests: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ...GHERKIN_TEST_SCHEMA.properties,
          category: { type: 'STRING', enum: [...NON_FUNCTIONAL_CATEGORIES] },
        },
        required: [...GHERKIN_TEST_SCHEMA.required, 'category'],
      },
    },
  },
  required: ['functional_tests', 'non_functional_tests'],
};

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: 'Server misconfiguration: GEMINI_API_KEY is not set in the deployment environment.',
    });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Request body must be valid JSON.' });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return jsonResponse(400, { error: validationError });
  }

  const story = body.story.trim();
  const maxTests = clamp(Math.round(Number(body.maxTests) || 10), 1, 30);
  const includeNonFunctional = Boolean(body.includeNonFunctional);

  const prompt = buildPrompt(story, maxTests, includeNonFunctional);

  try {
    const llmResponse = await fetch(GEMINI_API_URL(apiKey), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await safeReadText(llmResponse);
      return jsonResponse(502, {
        error: `The AI provider returned an error (status ${llmResponse.status}). ${errorText}`,
      });
    }

    const data = await llmResponse.json();
    const rawText = extractText(data);

    if (!rawText) {
      return jsonResponse(502, { error: 'The AI provider returned an empty response.' });
    }

    const parsed = parseModelJson(rawText);
    if (!parsed) {
      return jsonResponse(502, {
        error: 'The AI provider returned a response that could not be parsed as JSON.',
      });
    }

    const sanitized = sanitizeResult(parsed, story, maxTests, includeNonFunctional);

    return jsonResponse(200, sanitized);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error.';
    return jsonResponse(500, { error: message });
  }
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function validateBody(body: Partial<RequestBody>): string | null {
  if (!body || typeof body.story !== 'string' || body.story.trim().length === 0) {
    return 'A non-empty "story" field is required.';
  }
  if (body.story.length > MAX_STORY_LENGTH) {
    return `"story" must be ${MAX_STORY_LENGTH} characters or fewer.`;
  }
  if (body.maxTests !== undefined && Number.isNaN(Number(body.maxTests))) {
    return '"maxTests" must be a number.';
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// -----------------------------------------------------------------------------
// Prompt construction
// -----------------------------------------------------------------------------

function buildPrompt(story: string, maxTests: number, includeNonFunctional: boolean): string {
  const nonFunctionalInstruction = includeNonFunctional
    ? `Also derive non-functional test conditions. Only use these category values, and only
include a category when it is genuinely relevant to this specific story (do not force every
category to appear): ${NON_FUNCTIONAL_CATEGORIES.join(', ')}.`
    : 'Do not generate any non-functional test conditions. Return an empty array for "non_functional_tests".';

  return `You are a senior QA test analyst reviewing an agile user story. Analyze the story carefully
and produce a structured set of Gherkin-style test conditions that a QA engineer could execute
directly.

USER STORY:
"""
${story}
"""

INSTRUCTIONS:
1. Identify the actor, the goal, and the benefit implied by the story. Use this understanding to
   ground every test condition in what the story actually says — do not invent unrelated domain
   facts, business rules, or system behavior that isn't reasonably implied by the story text.
2. Derive functional test conditions that cover, where relevant to this story:
   - the primary/happy path
   - realistic alternate paths
   - validation of required or constrained inputs
   - negative paths and invalid input handling
   - permission or role considerations, if the story implies access control
   - boundary and data-limit conditions, if the story implies quantities, sizes, or ranges
   - state transitions and exception paths, if the story implies a stateful process
3. ${nonFunctionalInstruction}
4. Every test condition must be specific and testable — reference concrete elements of the story
   (the actor, the action, the object of the action) rather than generic filler like "the system
   works correctly."
5. Do not produce duplicate test conditions or near-duplicates that only reword the same scenario.
6. Write "given", "when", and "then" as plain clauses WITHOUT the leading keyword (the keyword is
   added by the renderer) — e.g. "when": "the user submits the form with a missing email address".
7. Produce at most ${maxTests} test conditions in total across functional_tests and
   non_functional_tests combined. Prioritize the most valuable and distinct scenarios if you must
   cut anything to stay within that limit.
8. Give each test condition a short, descriptive "title" (a few words, e.g. "Missing required
   field blocks submission").`;
}

// -----------------------------------------------------------------------------
// Response parsing / sanitization
// -----------------------------------------------------------------------------

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function extractText(data: unknown): string {
  const candidates = (data as GeminiResponse)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

function parseModelJson(rawText: string): unknown | null {
  // With responseSchema set, Gemini should return raw JSON with no fencing,
  // but we strip defensively in case of edge cases (e.g. a model swap that
  // doesn't honor responseMimeType as strictly).
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const candidate = cleaned.startsWith('{') ? cleaned : extractOutermostObject(cleaned);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractOutermostObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function sanitizeResult(
  parsed: unknown,
  story: string,
  maxTests: number,
  includeNonFunctional: boolean
): StoryTestResult {
  const obj = (parsed ?? {}) as Partial<StoryTestResult>;

  const functionalRaw = Array.isArray(obj.functional_tests) ? obj.functional_tests.filter(isGherkinTest) : [];
  const nonFunctionalRaw =
    includeNonFunctional && Array.isArray(obj.non_functional_tests)
      ? obj.non_functional_tests.filter(isNonFunctionalTest)
      : [];

  // Enforce the cap server-side too, in case the model overshoots: functional
  // tests take priority, non-functional tests fill whatever budget remains.
  const functional = functionalRaw.slice(0, maxTests);
  const remaining = Math.max(0, maxTests - functional.length);
  const nonFunctional = nonFunctionalRaw.slice(0, remaining);

  return {
    story,
    functional_tests: functional,
    non_functional_tests: nonFunctional,
  };
}

function isGherkinTest(value: unknown): value is GherkinTest {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.title === 'string' &&
    typeof t.given === 'string' &&
    typeof t.when === 'string' &&
    typeof t.then === 'string'
  );
}

function isNonFunctionalTest(value: unknown): value is NonFunctionalTest {
  if (!isGherkinTest(value)) return false;
  const category = (value as Record<string, unknown>).category;
  return typeof category === 'string';
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
