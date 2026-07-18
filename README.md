# Story → Test

Upload a CSV or Excel sheet of agile user stories and generate specific,
QA-ready Gherkin-style test conditions (functional by default, non-functional
on request) — deployable as a static site + serverless function on Netlify.

## Architecture decisions

**Frontend-only app, backed by a single Netlify Function.**
The UI (React + Vite + TypeScript + Tailwind) is a fully static bundle. The
only server-side code is `netlify/functions/generate-tests.ts`, a single
Netlify Function that:

- holds the `GEMINI_API_KEY` as a server-side environment variable (it is
  never sent to, or readable from, the browser)
- builds the LLM prompt
- calls the Google Gemini API
- validates/sanitizes the model's JSON output
- returns a clean, typed JSON payload to the frontend

This keeps the whole app deployable with `netlify deploy` and no separate
backend infrastructure, while still keeping the API key secret.

**Why Gemini?** Google's Gemini API has a genuine, permanent free tier — no
credit card, no trial expiry — generous enough for this app (roughly 1,500
requests/day and 1M tokens/minute on `gemini-2.5-flash` as of mid-2026). The
function also uses Gemini's "controlled generation" feature
(`responseSchema` + `responseMimeType: "application/json"`), which makes the
model return JSON conforming to an exact schema rather than just asking it
nicely in the prompt — this is more reliable than schema-by-prompt-only
approaches. If you'd rather use a different provider (Anthropic, OpenAI,
Groq, etc.), the only file you need to change is
`netlify/functions/generate-tests.ts` — swap the fetch call and response
parsing for that provider's API and update the expected environment variable
name.

**Why a function instead of calling the LLM straight from the browser?**
Calling a provider that requires a secret API key directly from client-side
JavaScript would expose that key to anyone who opens dev tools. Routing the
call through a Netlify Function keeps the secret server-side, which is the
approach requested for this project — this holds regardless of which LLM
provider sits behind the function.

**Parsing happens entirely client-side.** CSV/XLSX/XLS files are parsed in
the browser with [SheetJS (`xlsx`)](https://github.com/SheetJS/sheetjs).
Nothing about the uploaded file touches the server except the individual
story strings the user chooses to generate tests for (sent one story at a
time to `generate-tests`) — the file itself is never uploaded anywhere.

**Column detection is heuristic, not AI-driven.** Guessing which column holds
the user story text is a good fit for cheap, deterministic pattern matching
(`src/lib/columnDetection.ts`): it scores header names against known
conventions ("User Story", "Requirement", "Description", …) and scores
column values against the "As a … I want … so that …" shape. When confidence
is below a threshold, the UI asks the user to confirm/pick the column rather
than guessing silently — no need to spend an LLM call on this.

**One LLM call per story, with bounded concurrency.** Rather than batching
every story into a single giant prompt (which makes partial failures and
per-story error handling awkward, and risks truncated output on large
sheets), the frontend issues one request per story to the same Netlify
Function, capped at 3 concurrent requests at a time
(`src/lib/api.ts::generateTestsForStories`). This means:
- results stream in and render per-story as they complete
- one story failing (e.g. a transient LLM error) doesn't fail the whole
  batch — it's shown as a per-card error with the rest still succeeding
- generation respects the max-tests slider (1–30) and the non-functional
  toggle per request

**Structured output over free text.** Rather than only asking the model in
the prompt to return JSON, the function uses Gemini's `responseSchema` +
`responseMimeType: "application/json"` to constrain the output to an exact
shape (`{ functional_tests: [...], non_functional_tests: [...] }`) at the API
level. On top of that, the function still defensively strips stray code
fences, tries to isolate a JSON object if anything unexpected slips through,
and validates every test object's shape before returning it — malformed
entries are dropped rather than passed through to the UI. The max-tests cap
is also enforced server-side in case the model overshoots the requested
limit.

## Project structure

```
story-test-generator/
├── netlify/
│   └── functions/
│       └── generate-tests.ts     # Secure server-side LLM endpoint
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx        # Drag-and-drop + validated file picker
│   │   ├── PreviewTable.tsx      # Parsed-rows preview grid
│   │   ├── ColumnSelector.tsx    # Manual/confirmed story-column picker
│   │   ├── Controls.tsx          # Non-functional toggle + max-tests slider
│   │   ├── Stepper.tsx           # Upload → Map → Configure → Review
│   │   ├── ResultsView.tsx       # Story cards + CSV/Markdown export actions
│   │   ├── StoryResultCard.tsx   # Given/When/Then rendering per story
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBanner.tsx
│   │   └── LoadingState.tsx
│   ├── lib/
│   │   ├── fileParser.ts         # SheetJS-based CSV/XLSX/XLS parsing
│   │   ├── columnDetection.ts    # Heuristic story-column detection
│   │   ├── api.ts                # Frontend client for the Netlify Function
│   │   └── export.ts             # CSV / Markdown / plain-text export
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── types.ts
├── sample-data/
│   └── sample-user-stories.csv
├── index.html
├── netlify.toml
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── .env.example
```

## Setup

Requires Node.js 18+ and the [Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`npm install -g netlify-cli`) for local development, since `vite` alone
can't run the serverless function.

```bash
# 1. Install dependencies
npm install

# 2. Configure your API key for local development
cp .env.example .env
# then edit .env and set GEMINI_API_KEY=... (get a free key at
# https://aistudio.google.com/apikey — no credit card required)

# 3. Run the app (serves both the Vite frontend and the Netlify Function)
netlify dev
```

`netlify dev` starts Vite and the functions server together, proxying
requests so `/.netlify/functions/generate-tests` works exactly as it will in
production. Open the URL it prints (typically `http://localhost:8888`).

If you only want to iterate on UI without hitting the real function, `npm run dev`
also works — the function calls will simply 404 until you use `netlify dev`.

## Deploying to Netlify

**Option A — Netlify UI (recommended for first deploy)**

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. In Netlify: **Add new site → Import an existing project**, and pick the repo.
3. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Under **Site configuration → Environment variables**, add:
   - `GEMINI_API_KEY` = your free Google Gemini API key (from
     [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
   - (optional) `LLM_MODEL` if you want to pin a specific Gemini model
     (defaults to `gemini-2.5-flash`)
5. Deploy. Netlify will build the frontend and deploy
   `generate-tests.ts` as a serverless function automatically.

**Option B — Netlify CLI**

```bash
npm install -g netlify-cli
netlify init          # link or create a site
netlify env:set GEMINI_API_KEY your-free-gemini-key
netlify deploy --prod
```

## Testing it

Use `sample-data/sample-user-stories.csv` (included) to try the full flow:
upload → column auto-detected → adjust the slider/toggle → generate → export.

## Example prompt sent from the backend to the LLM

This is what `netlify/functions/generate-tests.ts` sends for a single story
(with `maxTests = 8` and non-functional tests enabled). Note that the JSON
output shape itself is enforced separately via Gemini's `responseSchema`
(see the function source), so the prompt doesn't need to spell out the exact
JSON structure — only the content rules:

```
You are a senior QA test analyst reviewing an agile user story. Analyze the story carefully
and produce a structured set of Gherkin-style test conditions that a QA engineer could execute
directly.

USER STORY:
"""
As a registered customer, I want to reset my password via email, so that I can regain access to my account if I forget it.
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
3. Also derive non-functional test conditions. Only use these category values, and only
include a category when it is genuinely relevant to this specific story (do not force every
category to appear): performance, accessibility, security, reliability, usability, compatibility, error handling, resilience.
4. Every test condition must be specific and testable — reference concrete elements of the story
   (the actor, the action, the object of the action) rather than generic filler like "the system
   works correctly."
5. Do not produce duplicate test conditions or near-duplicates that only reword the same scenario.
6. Write "given", "when", and "then" as plain clauses WITHOUT the leading keyword (the keyword is
   added by the renderer) — e.g. "when": "the user submits the form with a missing email address".
7. Produce at most 8 test conditions in total across functional_tests and
   non_functional_tests combined. Prioritize the most valuable and distinct scenarios if you must
   cut anything to stay within that limit.
8. Give each test condition a short, descriptive "title" (a few words, e.g. "Missing required
   field blocks submission").
```

Alongside this prompt, the request also sends a `generationConfig` with
`responseMimeType: "application/json"` and a `responseSchema` describing the
exact `functional_tests` / `non_functional_tests` shape, so Gemini's output
is constrained at the API level rather than relying on the model to follow
free-text formatting instructions.

## Notes and limitations

- The app sends one request per story; very large sheets (hundreds of rows)
  will take a while and consume proportional API usage. Concurrency is capped
  at 3 by default (`src/lib/api.ts`), which can be tuned.
- The model is instructed not to invent domain facts beyond what the story
  implies, but LLM output should still be reviewed by a QA engineer before
  being treated as final acceptance criteria.
- `localStorage`/`sessionStorage` are intentionally not used anywhere in this
  app — all state lives in React memory for the current session, per the
  project's constraints.
