/**
 * Honest preflight surface for the deferred browser-computed Experiment mode.
 *
 * This is intentionally not a solver UI. It communicates the validation gate
 * and planned first controls without suggesting that a live run is available.
 */
export interface ExperimentPreviewPanelProps {
  onClose: () => void;
}

/**
 * Explain the deferred live-compute contract from the Explore navigation.
 */
export function ExperimentPreviewPanel({ onClose }: ExperimentPreviewPanelProps) {
  return (
    <aside
      aria-labelledby="experiment-dialog-title"
      aria-modal="true"
      className="interpretation-panel experiment-panel"
      id="experiment-dialog"
      role="dialog"
    >
      <header className="panel-header">
        <p className="eyebrow">Experiment Preview</p>
        <button
          autoFocus
          className="panel-close"
          type="button"
          onClick={onClose}
          aria-label="Close Experiment preview"
        >
          Close
        </button>
      </header>
      <div className="readiness-badge">Not live yet</div>
      <h2 id="experiment-dialog-title">Compute a smaller universe in your browser.</h2>
      <p>
        Experiment will run separately from this validated reference playback. Before release,
        each seeded browser run must agree with matching <strong>lcdm_sim</strong> fixtures.
      </p>
      <dl className="readiness-grid">
        <div>
          <dt>First grids</dt>
          <dd>16 cubed / 32 cubed</dd>
        </div>
        <div>
          <dt>Execution</dt>
          <dd>Web Worker</dd>
        </div>
        <div>
          <dt>Controls</dt>
          <dd>Seed, resolution</dd>
        </div>
        <div>
          <dt>Gate</dt>
          <dd>Python fixture comparison</dd>
        </div>
      </dl>
      <p className="deferred-note">
        Deferred: live 64 cubed runs, WebGPU requirements, cosmology controls and runtime claims.
      </p>
    </aside>
  );
}
