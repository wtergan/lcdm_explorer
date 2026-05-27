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
    validation: { status: "validated", summary: { num_passed: 8 } },
  },
  volume: {
    dimensions: [128, 128, 128],
    box_size_mpc_h: 100,
    units: "overdensity",
    voxel_encoding: "uint8",
    layout: "C",
    scalar_transform: {
      name: "log1p_overdensity",
      input_floor: -0.999999,
      transformed_min: -13.8,
      transformed_max: 4.29,
    },
  },
  frames: [
    {
      index: 0,
      step: 0,
      a: 0.05,
      z: 19,
      path: "frames/density_0000.u8",
      byte_length: 2097152,
      density_std: 0.626,
    },
    {
      index: 1,
      step: 7,
      a: 0.715,
      z: 0.4,
      path: "frames/density_0001.u8",
      byte_length: 2097152,
      density_std: 1.773,
    },
  ],
});

describe("Explore field guide", () => {
  it("field guide is opened should explain reference playback", () => {
    render(<App initialDataset={dataset} />);

    fireEvent.click(screen.getByRole("button", { name: /open field guide/i }));

    expect(screen.getByText(/exported reference playback/i)).toBeInTheDocument();
    expect(screen.getByText(/later Experiment mode/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /diagnostics/i }));

    expect(screen.getByRole("heading", { name: /density contrast growth/i })).toBeInTheDocument();
    expect(screen.getByText("1.773")).toBeInTheDocument();
    expect(screen.getByText(/128 cubed voxels/i)).toBeInTheDocument();
  });
});
