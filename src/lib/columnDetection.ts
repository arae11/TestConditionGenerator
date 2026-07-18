import type { ColumnDetectionResult, ParsedRow } from '../types';

// Header names we recognize outright, ordered roughly by specificity.
const KNOWN_HEADER_NAMES = [
  'user story',
  'userstory',
  'story',
  'requirement',
  'requirement description',
  'description',
  'acceptance criteria story',
  'story text',
];

// A loose match for the canonical "As a <role>, I want <goal>, so that
// <benefit>." shape. We deliberately keep this permissive: "so that" is
// sometimes dropped, and punctuation varies a lot in the wild.
const STORY_PATTERN = /\bas an?\b.{3,}?\bi\s+(want|need|would like)\b/i;

/**
 * Scores how strongly a single header name matches a known "story-like"
 * column name. Returns 0..1.
 */
function scoreHeaderName(header: string): number {
  const normalized = header.trim().toLowerCase();
  if (KNOWN_HEADER_NAMES.includes(normalized)) {
    // Exact matches on the most specific names score highest.
    const rank = KNOWN_HEADER_NAMES.indexOf(normalized);
    return 1 - rank * 0.03;
  }
  if (normalized.includes('story')) return 0.7;
  if (normalized.includes('requirement')) return 0.55;
  if (normalized.includes('description')) return 0.4;
  return 0;
}

/**
 * Scores how strongly the *values* in a column look like user stories, by
 * sampling up to `sampleSize` rows and checking against STORY_PATTERN.
 */
function scoreColumnValues(header: string, rows: ParsedRow[], sampleSize = 15): number {
  const sample = rows.slice(0, sampleSize);
  if (sample.length === 0) return 0;

  let matches = 0;
  let nonEmpty = 0;
  for (const row of sample) {
    const value = row[header] ?? '';
    if (value.trim().length === 0) continue;
    nonEmpty++;
    if (STORY_PATTERN.test(value)) matches++;
  }
  if (nonEmpty === 0) return 0;
  return matches / nonEmpty;
}

/**
 * Combines header-name and value-shape scoring to guess which column holds
 * the user stories. Returns a best guess plus a confidence score and a
 * ranked list of plausible candidates so the UI can offer a manual picker
 * when confidence is low.
 */
export function detectStoryColumn(headers: string[], rows: ParsedRow[]): ColumnDetectionResult {
  const scored = headers.map((header) => {
    const nameScore = scoreHeaderName(header);
    const valueScore = scoreColumnValues(header, rows);
    // Value shape is the stronger signal (actual content beats naming
    // convention), but header name provides a useful tiebreaker and helps
    // when stories are short/atypical and don't match STORY_PATTERN well.
    const combined = valueScore * 0.7 + nameScore * 0.3;
    return { header, combined, nameScore, valueScore };
  });

  scored.sort((a, b) => b.combined - a.combined);

  const top = scored[0];
  const candidates = scored.filter((s) => s.combined > 0).map((s) => s.header);

  if (!top || top.combined === 0) {
    return { bestGuess: null, confidence: 0, candidates: headers };
  }

  return {
    bestGuess: top.header,
    confidence: Math.min(top.combined, 1),
    candidates: candidates.length > 0 ? candidates : headers,
  };
}

// Below this confidence, the UI should ask the user to confirm/select the
// column rather than proceeding silently.
export const CONFIDENCE_THRESHOLD = 0.55;
