import { useMemo, useState } from 'react';
import FileUpload from './components/FileUpload';
import PreviewTable from './components/PreviewTable';
import ColumnSelector from './components/ColumnSelector';
import Controls from './components/Controls';
import ResultsView from './components/ResultsView';
import EmptyState from './components/EmptyState';
import ErrorBanner from './components/ErrorBanner';
import LoadingState from './components/LoadingState';
import Stepper from './components/Stepper';
import { parseSpreadsheetFile, FileParseError } from './lib/fileParser';
import { detectStoryColumn, CONFIDENCE_THRESHOLD } from './lib/columnDetection';
import { generateTestsForStories } from './lib/api';
import type {
  ColumnDetectionResult,
  GenerationOptions,
  ParsedFile,
  StoryJob,
} from './types';

export default function App() {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const [detection, setDetection] = useState<ColumnDetectionResult | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  const [options, setOptions] = useState<GenerationOptions>({
    includeNonFunctional: false,
    maxTests: 10,
  });

  const [jobs, setJobs] = useState<StoryJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const storiesForSelectedColumn = useMemo(() => {
    if (!parsedFile || !selectedColumn) return [];
    return parsedFile.rows
      .map((row, rowIndex) => ({ rowIndex, story: (row[selectedColumn] ?? '').trim() }))
      .filter((entry) => entry.story.length > 0);
  }, [parsedFile, selectedColumn]);

  async function handleFileSelected(file: File) {
    setTopError(null);
    setIsParsing(true);
    setJobs([]);
    try {
      const result = await parseSpreadsheetFile(file);
      setParsedFile(result);

      const detected = detectStoryColumn(result.headers, result.rows);
      setDetection(detected);
      setSelectedColumn(
        detected.bestGuess && detected.confidence >= CONFIDENCE_THRESHOLD ? detected.bestGuess : null
      );
    } catch (err) {
      setParsedFile(null);
      setDetection(null);
      setSelectedColumn(null);
      setTopError(
        err instanceof FileParseError ? err.message : 'Something went wrong while reading that file.'
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function handleGenerate() {
    if (storiesForSelectedColumn.length === 0) return;

    const initialJobs: StoryJob[] = storiesForSelectedColumn.map((entry) => ({
      id: `row-${entry.rowIndex}`,
      rowIndex: entry.rowIndex,
      story: entry.story,
      status: 'pending',
    }));
    setJobs(initialJobs);
    setIsGenerating(true);

    // Mark everything as loading up front so the UI shows immediate progress.
    setJobs((prev) => prev.map((job) => ({ ...job, status: 'loading' })));

    await generateTestsForStories(
      storiesForSelectedColumn.map((e) => ({ id: `row-${e.rowIndex}`, story: e.story })),
      options,
      (id, result, error) => {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: error ? 'error' : 'done',
                  result,
                  error,
                }
              : job
          )
        );
      }
    );

    setIsGenerating(false);
  }

  const currentStep = jobs.length > 0 ? 4 : selectedColumn ? 3 : parsedFile ? 2 : 1;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-brand">Story → Test</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
              Turn user stories into Gherkin test conditions
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Upload a CSV or Excel sheet of user stories and generate specific, QA-ready
              Given/When/Then scenarios — functional by default, non-functional on request.
            </p>
          </div>
          <Stepper currentStep={currentStep} />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        {topError && <ErrorBanner message={topError} onDismiss={() => setTopError(null)} />}

        <section aria-labelledby="upload-heading" className="flex flex-col gap-3">
          <h2 id="upload-heading" className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
            1. Upload
          </h2>
          <FileUpload onFileSelected={handleFileSelected} currentFileName={parsedFile?.fileName} disabled={isParsing} />
        </section>

        {isParsing && <LoadingState label="Reading your file…" />}

        {parsedFile && detection && (
          <>
            <section aria-labelledby="map-heading" className="flex flex-col gap-3">
              <h2 id="map-heading" className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
                2. Map the story column
              </h2>
              <ColumnSelector
                headers={parsedFile.headers}
                selectedColumn={selectedColumn}
                detection={detection}
                onSelect={setSelectedColumn}
              />
              <PreviewTable headers={parsedFile.headers} rows={parsedFile.rows} selectedColumn={selectedColumn} />
            </section>

            <section aria-labelledby="configure-heading" className="flex flex-col gap-3">
              <h2
                id="configure-heading"
                className="font-display text-sm font-semibold uppercase tracking-wide text-muted"
              >
                3. Configure and generate
              </h2>
              <Controls
                options={options}
                onChange={setOptions}
                onGenerate={handleGenerate}
                disabled={!selectedColumn || storiesForSelectedColumn.length === 0}
                isGenerating={isGenerating}
                storyCount={storiesForSelectedColumn.length}
              />
              {selectedColumn && storiesForSelectedColumn.length === 0 && (
                <p className="text-sm text-warn">
                  The selected column doesn't have any non-empty values to generate tests from.
                </p>
              )}
            </section>
          </>
        )}

        <section aria-labelledby="results-heading" className="flex flex-col gap-3">
          <h2 id="results-heading" className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
            4. Review results
          </h2>
          {jobs.length > 0 ? <ResultsView jobs={jobs} /> : <EmptyState />}
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-muted sm:px-6">
        Generated content is a starting point for QA review, not a substitute for domain expertise.
      </footer>
    </div>
  );
}
