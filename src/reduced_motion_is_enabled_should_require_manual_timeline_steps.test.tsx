import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

const dataset = parseReferenceDataset({
  schema_version: 1,
  format: "lcdm-density-volume",
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-66635bfe6a",
    validation: { status: "validated" },
  },
  volume: {
    dimensions: [4, 4, 4],
    box_size_mpc_h: 100,
    units: "overdensity",
    voxel_encoding: "uint8",
    layout: "C",
    scalar_transform: {
      name: "log1p_overdensity",
      input_floor: -1,
      transformed_min: -2,
      transformed_max: 4,
    },
  },
  frames: [
    {
      index: 0,
      step: 0,
      a: 0.05,
      z: 19,
      path: "frames/density_0000.u8",
      byte_length: 64,
      density_std: 0.6,
    },
  ],
});

describe("Reduced motion playback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reduced motion is enabled should require manual timeline steps", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<App initialDataset={dataset} />);

    expect(
      screen.getByRole("button", { name: /playback unavailable while reduced motion is enabled/i }),
    ).toBeDisabled();
    expect(screen.getByRole("slider", { name: /cosmic time frame/i })).toHaveAttribute(
      "step",
      "1",
    );
    expect(screen.getByText(/manual stages only/i)).toBeInTheDocument();
  });
});
