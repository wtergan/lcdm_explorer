/**
 * Explore-first application shell for the LCDM educational exhibit.
 *
 * This surface communicates the provenance and mode boundary around the
 * density-volume renderer. It owns dataset and timeline state while the
 * renderer module owns graphics resources and interaction cleanup.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import {
  loadReferenceDataset,
  type ReferenceDataset,
} from "./data/referenceDataset";
import {
  InterpretationPanel,
  type InterpretationTab,
} from "./explore/InterpretationPanel";
const DensityVolumeViewer = lazy(async () => {
  const module = await import("./viewer/DensityVolumeViewer");
  return { default: module.DensityVolumeViewer };
});

type DatasetState =
  | { status: "loading" }
  | { status: "ready"; dataset: ReferenceDataset }
  | { status: "error"; message: string };

export interface AppProps {
  initialDataset?: ReferenceDataset;
}

const manifestUrl = "/datasets/gallery_128/manifest.json";

function ReferenceExhibit({ dataset }: { dataset: ReferenceDataset }) {
  const [frameIndex, setFrameIndex] = useState(Math.min(3, dataset.frames.length - 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [interpretationTab, setInterpretationTab] = useState<InterpretationTab>("guide");
  const selectedFrame = dataset.frames[frameIndex];

  useEffect(() => {
    if (!isPlaying || dataset.frames.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % dataset.frames.length);
    }, 1300);
    return () => window.clearInterval(timer);
  }, [dataset.frames.length, isPlaying]);

  return (
    <main className="exhibit-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="lcdm explorer home">
          lcdm_explorer
        </a>
        <nav className="mode-switch" aria-label="Experience mode">
          <button className="mode active" type="button" aria-current="page">
            Explore
          </button>
          <button className="mode" type="button" disabled>
            Experiment <span className="later">after validation</span>
          </button>
        </nav>
        <p className="validation-badge">
          <span aria-hidden="true" />
          Validated reference simulation
        </p>
      </header>

      <section className="explore-layout" aria-label="Explore reference playback">
        <aside className="context-panel" aria-label="Cosmic time and provenance">
          <p className="eyebrow">Cosmic Time</p>
          <p className="time-value">a = {selectedFrame.a.toFixed(3)}</p>
          <p className="time-value subdued">z = {selectedFrame.z.toFixed(2)}</p>

          <div className="divider" />
          <p className="eyebrow">Source</p>
          <p className="provenance">Exported from lcdm_sim</p>
          <p className="run-id">{dataset.provenance.run_id}</p>
          <p className="boundary">
            Educational model playback, not a precision cosmology prediction.
          </p>
          <button className="guide-trigger" type="button" onClick={() => setIsGuideOpen(true)}>
            Open field guide
          </button>
        </aside>

        <section className="viewer-stage" aria-label="Interactive density volume">
          <Suspense fallback={<p className="viewer-loading">Preparing viewer...</p>}>
            <DensityVolumeViewer
              dataset={dataset}
              frameIndex={frameIndex}
              resetViewToken={resetViewToken}
            />
          </Suspense>
          <div className="interaction-bar">
            <p className="interaction-hint">Drag to orbit / scroll to zoom</p>
            <button className="reset-view" type="button" onClick={() => setResetViewToken((token) => token + 1)}>
              Reset view
            </button>
          </div>
          {isGuideOpen ? (
            <InterpretationPanel
              dataset={dataset}
              frameIndex={frameIndex}
              tab={interpretationTab}
              onTabChange={setInterpretationTab}
              onClose={() => setIsGuideOpen(false)}
            />
          ) : null}
        </section>

        <aside className="frame-rail" aria-label="Reference stages">
          <p className="eyebrow">Scale factor a</p>
          <ol>
            {dataset.frames.map((frame) => (
              <li className={frame.index === selectedFrame.index ? "selected" : ""} key={frame.step}>
                <span />
                {frame.a.toFixed(3)}
              </li>
            ))}
          </ol>
          <p className="rail-foot">Early universe to present day</p>
        </aside>
      </section>

      <footer className="timeline-shell">
        <button
          className="play"
          type="button"
          aria-label={isPlaying ? "Pause playback" : "Play evolution"}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          <span aria-hidden="true">{isPlaying ? "||" : ">"}</span>
        </button>
        <button
          className="stage-step"
          type="button"
          aria-label="Previous stage"
          onClick={() =>
            setFrameIndex((current) => (current - 1 + dataset.frames.length) % dataset.frames.length)
          }
        >
          {"<"}
        </button>
        <div className="timeline-content">
          <p className="eyebrow">Evolution Timeline</p>
          <input
            aria-label="Cosmic time frame"
            className="timeline-range"
            type="range"
            min={0}
            max={dataset.frames.length - 1}
            value={frameIndex}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
          />
        </div>
        <button
          className="stage-step"
          type="button"
          aria-label="Next stage"
          onClick={() => setFrameIndex((current) => (current + 1) % dataset.frames.length)}
        >
          {">"}
        </button>
      </footer>
    </main>
  );
}

export function App({ initialDataset }: AppProps) {
  const initialState = useMemo<DatasetState>(
    () =>
      initialDataset
        ? { status: "ready", dataset: initialDataset }
        : { status: "loading" },
    [initialDataset],
  );
  const [state, setState] = useState<DatasetState>(initialState);

  useEffect(() => {
    if (initialDataset) {
      return;
    }
    const controller = new AbortController();
    loadReferenceDataset(manifestUrl, controller.signal)
      .then((dataset) => setState({ status: "ready", dataset }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : "Dataset load failed";
          setState({ status: "error", message });
        }
      });
    return () => controller.abort();
  }, [initialDataset]);

  if (state.status === "loading") {
    return (
      <main className="state-screen" aria-busy="true">
        <p className="eyebrow">Explore</p>
        <h1>Preparing validated reference volumes...</h1>
      </main>
    );
  }
  if (state.status === "error") {
    return (
      <main className="state-screen error-state" role="alert">
        <p className="eyebrow">Reference Dataset Unavailable</p>
        <h1>Explore cannot begin safely.</h1>
        <p>{state.message}</p>
      </main>
    );
  }
  return <ReferenceExhibit dataset={state.dataset} />;
}
