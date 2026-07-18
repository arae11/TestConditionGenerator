// Shared types used across the frontend and mirrored (loosely) by the
// Netlify function response shape.

export interface ParsedRow {
  [column: string]: string;
}

export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: ParsedRow[];
}

export interface ColumnDetectionResult {
  bestGuess: string | null;
  confidence: number; // 0..1
  candidates: string[];
}

export interface GherkinTest {
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface NonFunctionalTest extends GherkinTest {
  category: NonFunctionalCategory;
}

export type NonFunctionalCategory =
  | 'performance'
  | 'accessibility'
  | 'security'
  | 'reliability'
  | 'usability'
  | 'compatibility'
  | 'error handling'
  | 'resilience';

export interface StoryTestResult {
  story: string;
  functional_tests: GherkinTest[];
  non_functional_tests: NonFunctionalTest[];
}

export type StoryStatus = 'pending' | 'loading' | 'done' | 'error';

export interface StoryJob {
  id: string;
  rowIndex: number;
  story: string;
  status: StoryStatus;
  result?: StoryTestResult;
  error?: string;
}

export interface GenerationOptions {
  includeNonFunctional: boolean;
  maxTests: number; // 1..30, this is a per-story ceiling across functional + non-functional
}
