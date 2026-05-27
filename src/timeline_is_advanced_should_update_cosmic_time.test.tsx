import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

const dataset = parseReferenceDataset({
  schema_version: 1,
  format: "lcdm-density-volume",
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-66635bfe6a",
    config: {},
    validation: { status: "validated", summary: { num_failed: 0 } },
  },
  volume: {
    dimensions: [4, 4, 4],
    box_size_mpc_h: 100,
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
    {
      index: 1,
      step: 10,
      a: 1,
      z: 0,
      path: "frames/density_0001.u8",
      byte_length: 64,
      density_std: 1.9,
    },
  ],
});

describe("Explore timeline", () => {
  it("timeline is advanced should update cosmic time", () => {
    render(<App initialDataset={dataset} />);

    expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next stage/i }));

    expect(screen.getByText(/a = 0.050/i)).toBeInTheDocument();
    expect(screen.getByText(/z = 19.00/i)).toBeInTheDocument();
  });
});
