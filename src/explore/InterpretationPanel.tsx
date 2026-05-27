/**
 * Interpretive overlay for the validated Explore reference playback.
 *
 * This panel reads only manifest-backed values: it explains the visual
 * encoding and plots exported density contrast without fabricating particle
 * views or browser-computed diagnostics.
 */
import type { ReferenceDataset } from "../data/referenceDataset";

export type InterpretationTab = "guide" | "diagnostics";

export interface InterpretationPanelProps {
  dataset: ReferenceDataset;
  frameIndex: number;
  tab: InterpretationTab;
  onTabChange: (tab: InterpretationTab) => void;
  onClose: () => void;
}

function DensityGrowthChart({
  dataset,
  frameIndex,
}: Pick<InterpretationPanelProps, "dataset" | "frameIndex">) {
  const values = dataset.frames.map((frame) => frame.density_std);
  const maximum = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 46 - (value / maximum) * 40;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <figure className="diagnostic-plot" aria-label="Density contrast growth across reference frames">
      <svg viewBox="0 0 100 50" role="img" aria-label="Density contrast grows through cosmic time">
        <path className="plot-grid" d="M 0 46 H 100 M 0 26 H 100 M 0 6 H 100" />
        <polyline className="plot-line" points={points} />
        {values.map((value, index) => {
          const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
          const y = 46 - (value / maximum) * 40;
          return (
            <circle
              className={index === frameIndex ? "active" : ""}
              cx={x}
              cy={y}
              key={dataset.frames[index].step}
              r={index === frameIndex ? 2.3 : 1.3}
            />
          );
        })}
      </svg>
      <figcaption>
        Current density contrast <strong>{dataset.frames[frameIndex].density_std.toFixed(3)}</strong>
      </figcaption>
    </figure>
  );
}

/**
 * Present explanatory and diagnostic views over the hero volume.
 */
export function InterpretationPanel({
  dataset,
  frameIndex,
  tab,
  onTabChange,
  onClose,
}: InterpretationPanelProps) {
  return (
    <aside className="interpretation-panel" aria-label="Explore field guide">
      <header className="panel-header">
        <p className="eyebrow">Field Guide</p>
        <button className="panel-close" type="button" onClick={onClose} aria-label="Close field guide">
          Close
        </button>
      </header>
      <nav className="panel-tabs" aria-label="Field guide sections">
        <button
          className={tab === "guide" ? "selected" : ""}
          type="button"
          aria-current={tab === "guide" ? "page" : undefined}
          onClick={() => onTabChange("guide")}
        >
          Guide
        </button>
        <button
          className={tab === "diagnostics" ? "selected" : ""}
          type="button"
          aria-current={tab === "diagnostics" ? "page" : undefined}
          onClick={() => onTabChange("diagnostics")}
        >
          Diagnostics
        </button>
      </nav>
      {tab === "guide" ? (
        <div className="panel-content">
          <h2>How structure appears</h2>
          <p>
            This is exported reference playback from a validated <strong>lcdm_sim</strong> run.
            Brighter threads mark matter concentrating into filaments and knots as cosmic time
            advances.
          </p>
          <ul className="density-key" aria-label="Density color key">
            <li className="void">Low density / void</li>
            <li className="filament">Filament</li>
            <li className="knot">Dense knot</li>
          </ul>
          <p className="method-note">
            A later Experiment mode will be labeled separately because it computes smaller
            browser-side runs rather than replaying this reference dataset.
          </p>
        </div>
      ) : (
        <div className="panel-content">
          <h2>Density contrast growth</h2>
          <p>
            Spread in the exported density field rises as initially small variations collect into
            visible structure.
          </p>
          <DensityGrowthChart dataset={dataset} frameIndex={frameIndex} />
          <dl className="dataset-facts">
            <div>
              <dt>Volume</dt>
              <dd>{dataset.volume.dimensions[0]} cubed voxels</dd>
            </div>
            <div>
              <dt>Box size</dt>
              <dd>{dataset.volume.box_size_mpc_h.toFixed(0)} Mpc/h</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}
