import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

const dataset = parseReferenceDataset({
  schema_version: 2,
  format: "lcdm-density-particles",
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-66635bfe6a",
    validation: { status: "validated", summary: { num_failed: 0 } },
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
  particles: {
    source_particle_count: 64,
    sample_count: 12,
    sample_seed: 5,
    sample_method: "numpy.default_rng.choice_without_replacement",
    sample_indices_sha256:
      "a82a023bcda74f05b9d8fed3f6730a09f5bbb128ea84ca87c113a46f5e5e4798",
    position_encoding: "uint16_normalized",
    layout: "interleaved_xyz",
    byte_order: "little_endian",
    coordinate_space: "periodic_box_fraction",
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
      particles: {
        path: "frames/particles_0000.u16",
        byte_length: 72,
        particle_count: 12,
      },
    },
  ],
});

describe("Particle reference controls", () => {
  it("particle manifest is loaded should enable particle view modes", () => {
    render(<App initialDataset={dataset} />);

    fireEvent.click(screen.getByRole("button", { name: /both/i }));
    expect(screen.getByRole("button", { name: /both/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /particles/i }));
    expect(screen.getByRole("button", { name: /particles/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
