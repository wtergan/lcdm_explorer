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
    {
      index: 1,
      step: 1,
      a: 0.2,
      z: 4,
      path: "frames/density_0001.u8",
      byte_length: 64,
      density_std: 0.7,
    },
    {
      index: 2,
      step: 2,
      a: 0.5,
      z: 1,
      path: "frames/density_0002.u8",
      byte_length: 64,
      density_std: 0.8,
    },
    {
      index: 3,
      step: 3,
      a: 0.715,
      z: 0.4,
      path: "frames/density_0003.u8",
      byte_length: 64,
      density_std: 0.9,
    },
    {
      index: 4,
      step: 4,
      a: 1,
      z: 0,
      path: "frames/density_0004.u8",
      byte_length: 64,
      density_std: 1,
    },
  ],
});

describe("Viewer wheel scrub", () => {
  it("wheel over viewer should scrub reference time", () => {
    render(<App initialDataset={dataset} />);

    expect(screen.getByText(/a = 0.715/i)).toBeInTheDocument();

    fireEvent.wheel(screen.getByRole("region", { name: /interactive density volume/i }), {
      deltaY: 240,
    });

    expect(screen.getByText(/a = 1.000/i)).toBeInTheDocument();
  });
});
