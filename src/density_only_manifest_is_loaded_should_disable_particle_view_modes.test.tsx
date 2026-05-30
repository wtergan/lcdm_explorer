import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

const dataset = parseReferenceDataset({
  schema_version: 1,
  format: "lcdm-density-volume",
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-density-only",
    validation: { status: "validated" },
  },
  volume: {
    dimensions: [4, 4, 4],
    box_size_mpc_h: 32,
    units: "overdensity",
    voxel_encoding: "uint8",
    layout: "C",
    scalar_transform: {
      name: "log1p_overdensity",
      input_floor: -0.999999,
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

describe("Density-only reference view", () => {
  it("density only manifest is loaded should disable particle view modes", () => {
    render(<App initialDataset={dataset} />);

    expect(screen.getByRole("button", { name: /^density$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /both/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /particles/i })).toBeDisabled();
  });
});
