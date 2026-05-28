import { describe, expect, it } from "vitest";

import { datasetHasParticles, parseReferenceDataset } from "./referenceDataset";

const baseManifest = {
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-66635bfe6a",
    config: {},
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
};

describe("reference dataset particle manifests", () => {
  it("particle manifest is loaded should enable particle assets", () => {
    const parsed = parseReferenceDataset({
      ...baseManifest,
      schema_version: 2,
      format: "lcdm-density-particles",
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

    expect(datasetHasParticles(parsed)).toBe(true);
    if (!datasetHasParticles(parsed)) {
      throw new Error("Expected particle manifest to narrow to v2 dataset");
    }
    expect(parsed.particles.sample_count).toBe(12);
    expect(parsed.frames[0].particles.path).toBe("frames/particles_0000.u16");
  });

  it("density only manifest is loaded should keep particle assets disabled", () => {
    const parsed = parseReferenceDataset({
      ...baseManifest,
      schema_version: 1,
      format: "lcdm-density-volume",
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

    expect(datasetHasParticles(parsed)).toBe(false);
  });

  it("particle frame byte length disagrees with sample count should reject manifest", () => {
    expect(() =>
      parseReferenceDataset({
        ...baseManifest,
        schema_version: 2,
        format: "lcdm-density-particles",
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
              byte_length: 70,
              particle_count: 12,
            },
          },
        ],
      }),
    ).toThrow(/expected 72 uint16 particle bytes/i);
  });
});
