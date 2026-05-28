import { describe, expect, it } from "vitest";

import { parseReferenceDataset } from "./referenceDataset";

const manifest = {
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
    dimensions: [128, 128, 128],
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
      byte_length: 2097152,
      density_std: 0.626,
    },
  ],
};

describe("reference dataset manifest", () => {
  it("export manifest is unsupported should reject reference dataset", () => {
    expect(() =>
      parseReferenceDataset({ ...manifest, schema_version: 3 }),
    ).toThrow(/unsupported/i);
  });

  it("validated density manifest should return typed reference dataset", () => {
    const parsed = parseReferenceDataset(manifest);

    expect(parsed.scenario_id).toBe("gallery_128");
    expect(parsed.frames[0].z).toBe(19);
  });

  it("export manifest has no frames should reject empty playback", () => {
    expect(() => parseReferenceDataset({ ...manifest, frames: [] })).toThrow(/invalid/i);
  });

  it("frame byte length disagrees with volume should reject reference dataset", () => {
    const inconsistent = {
      ...manifest,
      frames: [{ ...manifest.frames[0], byte_length: 63 }],
    };

    expect(() => parseReferenceDataset(inconsistent)).toThrow(/expected 2097152 uint8 voxel bytes/i);
  });
});
