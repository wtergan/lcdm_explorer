/**
 * Explore-first application shell for the LCDM educational exhibit.
 *
 * This surface communicates the provenance and mode boundary around the
 * density-volume renderer. It owns dataset and timeline state while the
 * renderer module owns graphics resources and interaction cleanup.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from "react";

import {
  datasetHasParticles,
  loadReferenceDataset,
  type ReferenceDataset,
} from "./data/referenceDataset";
import {
  InterpretationPanel,
  type InterpretationTab,
} from "./explore/InterpretationPanel";
import { ExperimentPreviewPanel } from "./experiment/ExperimentPreviewPanel";
import type { GeometryMode, ViewMode } from "./viewer/DensityVolumeViewer";
const DensityVolumeViewer = lazy(async () => {
  const module = await import("./viewer/DensityVolumeViewer");
  return { default: module.DensityVolumeViewer };
});

type DatasetState =
  | { status: "loading" }
  | { status: "ready"; dataset: ReferenceDataset }
  | { status: "error"; message: string };
type Overlay = "guide" | "experiment" | null;

export interface AppProps {
  initialDataset?: ReferenceDataset;
}

const manifestUrl = "/datasets/gallery_128/manifest.json";
const defaultFrameIndex = 3;

function clampScrubPosition(position: number, maxFrameIndex: number) {
  if (!Number.isFinite(position)) {
    return 0;
  }
  return Math.min(Math.max(position, 0), maxFrameIndex);
}

function wheelDeltaToFrameStep(event: WheelEvent<HTMLElement>) {
  const deltaScale = event.deltaMode === 1 ? 0.12 : event.deltaMode === 2 ? 1 : 0.006;
  return Math.min(Math.max(event.deltaY * deltaScale, -1), 1);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function ReferenceExhibit({ dataset }: { dataset: ReferenceDataset }) {
  const maxFrameIndex = dataset.frames.length - 1;
  const [scrubPosition, setScrubPosition] = useState(
    Math.min(defaultFrameIndex, maxFrameIndex),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [interpretationTab, setInterpretationTab] = useState<InterpretationTab>("guide");
  const [geometryMode, setGeometryMode] = useState<GeometryMode>("sphere");
  const [viewMode, setViewMode] = useState<ViewMode>("density");
  const guideTriggerRef = useRef<HTMLButtonElement>(null);
  const experimentTriggerRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const playbackRunning = isPlaying && !prefersReducedMotion;
  const hasParticleAssets = datasetHasParticles(dataset);
  const activeViewMode = hasParticleAssets ? viewMode : "density";
  const activeScrubPosition = clampScrubPosition(scrubPosition, maxFrameIndex);
  const selectedFrameIndex = Math.round(activeScrubPosition);
  const currentFrameIndex = Math.floor(activeScrubPosition);
  const nextFrameIndex = Math.min(currentFrameIndex + 1, maxFrameIndex);
  const frameBlend = prefersReducedMotion
    ? 0
    : activeScrubPosition - currentFrameIndex;
  const selectedFrame = dataset.frames[selectedFrameIndex];

  const closeOverlay = useCallback(() => {
    const closing = overlay;
    setOverlay(null);
    window.queueMicrotask(() => {
      if (closing === "guide") {
        guideTriggerRef.current?.focus();
      } else if (closing === "experiment") {
        experimentTriggerRef.current?.focus();
      }
    });
  }, [overlay]);

  useEffect(() => {
    if (!playbackRunning || dataset.frames.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setScrubPosition((current) => {
        const next = current + 0.08;
        return next > maxFrameIndex ? 0 : next;
      });
    }, 80);
    return () => window.clearInterval(timer);
  }, [dataset.frames.length, maxFrameIndex, playbackRunning]);

  const jumpToFrame = useCallback(
    (frameIndex: number) => {
      setIsPlaying(false);
      setScrubPosition(clampScrubPosition(frameIndex, maxFrameIndex));
    },
    [maxFrameIndex],
  );

  const handleTimelineChange = useCallback(
    (position: number) => {
      setIsPlaying(false);
      setScrubPosition(clampScrubPosition(position, maxFrameIndex));
    },
    [maxFrameIndex],
  );

  const scrubByWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      if (overlay) {
        return;
      }
      event.preventDefault();
      setIsPlaying(false);
      const delta = wheelDeltaToFrameStep(event);
      setScrubPosition((current) => clampScrubPosition(current + delta, maxFrameIndex));
    },
    [maxFrameIndex, overlay],
  );

  useEffect(() => {
    if (!overlay) {
      return;
    }
    const constrainDialogFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlay();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = document.getElementById(`${overlay}-dialog`);
      const controls = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) {
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", constrainDialogFocus);
    return () => document.removeEventListener("keydown", constrainDialogFocus);
  }, [closeOverlay, overlay]);

  return (
    <main className="exhibit-shell">
      <a className="skip-link" href="#explore-content" tabIndex={overlay ? -1 : undefined}>
        Skip to viewer
      </a>
      <h1 className="sr-only">Explore cosmic structure formation</h1>
      <header className="topbar" inert={overlay ? true : undefined}>
        <a className="brand" href="/" aria-label="lcdm explorer home">
          lcdm_explorer
        </a>
        <nav className="mode-switch" aria-label="Experience mode">
          <button className="mode active" type="button" aria-current="page">
            Explore
          </button>
          <button
            className="mode"
            type="button"
            ref={experimentTriggerRef}
            aria-controls="experiment-dialog"
            aria-expanded={overlay === "experiment"}
            onClick={() => setOverlay("experiment")}
          >
            Experiment <span className="later">preview</span>
          </button>
        </nav>
        <p className="validation-badge">
          <span aria-hidden="true" />
          Validated reference simulation
        </p>
      </header>

      <section
        className="explore-layout"
        id="explore-content"
        tabIndex={-1}
        aria-label="Explore reference playback"
      >
        <aside
          className="context-panel"
          aria-label="Cosmic time and provenance"
          inert={overlay ? true : undefined}
        >
          <p className="eyebrow">Cosmic Time</p>
          <p className="time-value">a = {selectedFrame.a.toFixed(3)}</p>
          <p className="time-value subdued">z = {selectedFrame.z.toFixed(2)}</p>

          <section className="frame-rail" aria-label="Reference stages">
            <p className="eyebrow">Scale factor ladder</p>
            <ol>
              {dataset.frames.map((frame) => (
                <li
                  aria-current={frame.index === selectedFrame.index ? "step" : undefined}
                  className={frame.index === selectedFrame.index ? "selected" : ""}
                  key={frame.step}
                >
                  <span aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => jumpToFrame(frame.index)}
                    aria-label={`Jump to scale factor ${frame.a.toFixed(3)}, redshift ${frame.z.toFixed(2)}`}
                  >
                    <strong>{frame.a.toFixed(3)}</strong>
                    <small>z {frame.z.toFixed(2)}</small>
                  </button>
                </li>
              ))}
            </ol>
            <p className="rail-foot">Even visual steps, true saved-frame labels.</p>
          </section>

          <div className="divider" />
          <p className="eyebrow">Source</p>
          <p className="provenance">Exported from lcdm_sim</p>
          <p className="run-id">{dataset.provenance.run_id}</p>
          <p className="boundary">
            Educational model playback, not a precision cosmology prediction.
          </p>
          <button
            className="guide-trigger"
            type="button"
            ref={guideTriggerRef}
            aria-controls="guide-dialog"
            aria-expanded={overlay === "guide"}
            onClick={() => setOverlay("guide")}
          >
            Open field guide
          </button>
        </aside>

        <section
          className={`viewer-stage${overlay ? " has-panel" : ""}`}
          aria-label="Interactive density volume"
          onWheel={scrubByWheel}
        >
          <div className="viewer-content" inert={overlay ? true : undefined}>
            <div className="viewer-control-deck" aria-label="Viewer presentation controls">
              <div className="viewer-control-group" aria-label="Volume geometry">
                <p>Geometry</p>
                <button
                  type="button"
                  aria-pressed={geometryMode === "sphere"}
                  onClick={() => setGeometryMode("sphere")}
                >
                  Sphere
                </button>
                <button
                  type="button"
                  aria-pressed={geometryMode === "cube"}
                  onClick={() => setGeometryMode("cube")}
                >
                  Cube
                </button>
              </div>
              <div className="viewer-control-group" aria-label="Reference layer">
                <p>Layer</p>
                <button
                  type="button"
                  aria-pressed={activeViewMode === "density"}
                  onClick={() => setViewMode("density")}
                >
                  Density
                </button>
                <button
                  type="button"
                  aria-pressed={activeViewMode === "both"}
                  disabled={!hasParticleAssets}
                  onClick={() => setViewMode("both")}
                >
                  Both
                </button>
                <button
                  type="button"
                  aria-pressed={activeViewMode === "particles"}
                  disabled={!hasParticleAssets}
                  onClick={() => setViewMode("particles")}
                >
                  Particles
                </button>
              </div>
            </div>
            <Suspense fallback={<p className="viewer-loading">Preparing viewer...</p>}>
              <DensityVolumeViewer
                dataset={dataset}
                frameIndex={currentFrameIndex}
                nextFrameIndex={nextFrameIndex}
                particleFrameIndex={selectedFrameIndex}
                frameBlend={frameBlend}
                geometryMode={geometryMode}
                viewMode={activeViewMode}
                resetViewToken={resetViewToken}
              />
            </Suspense>
            <div className="interaction-bar">
              <p className="interaction-hint" id="volume-interaction-help">
                Scroll over viewer to scrub time / drag or arrow keys to orbit / +/- to zoom
              </p>
              <button className="reset-view" type="button" onClick={() => setResetViewToken((token) => token + 1)}>
                Reset view
              </button>
            </div>
          </div>
          {overlay === "guide" ? (
            <InterpretationPanel
              dataset={dataset}
              frameIndex={selectedFrameIndex}
              tab={interpretationTab}
              onTabChange={setInterpretationTab}
              onClose={closeOverlay}
            />
          ) : null}
          {overlay === "experiment" ? (
            <ExperimentPreviewPanel onClose={closeOverlay} />
          ) : null}
        </section>
      </section>

      <footer className="timeline-shell" inert={overlay ? true : undefined}>
        <button
          className="play"
          type="button"
          aria-label={
            prefersReducedMotion
              ? "Playback unavailable while reduced motion is enabled"
              : playbackRunning
                ? "Pause playback"
                : "Play evolution"
          }
          disabled={prefersReducedMotion}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          <span aria-hidden="true">{playbackRunning ? "||" : ">"}</span>
        </button>
        <button
          className="stage-step"
          type="button"
          aria-label="Previous stage"
          onClick={() =>
            jumpToFrame((selectedFrameIndex - 1 + dataset.frames.length) % dataset.frames.length)
          }
        >
          {"<"}
        </button>
        <div className="timeline-content">
          <p className="eyebrow">Evolution Timeline</p>
          {prefersReducedMotion ? <p className="motion-note">Manual stages only: reduced motion enabled.</p> : null}
          <input
            aria-label="Cosmic time frame"
            className="timeline-range"
            type="range"
            min={0}
            max={dataset.frames.length - 1}
            step={prefersReducedMotion ? 1 : 0.01}
            value={activeScrubPosition}
            aria-valuetext={`a = ${selectedFrame.a.toFixed(3)}, z = ${selectedFrame.z.toFixed(2)}`}
            onChange={(event) => handleTimelineChange(Number(event.target.value))}
          />
        </div>
        <button
          className="stage-step"
          type="button"
          aria-label="Next stage"
          onClick={() => jumpToFrame((selectedFrameIndex + 1) % dataset.frames.length)}
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
        <p>{state.message}. Reload the page to try again.</p>
      </main>
    );
  }
  return <ReferenceExhibit dataset={state.dataset} />;
}
