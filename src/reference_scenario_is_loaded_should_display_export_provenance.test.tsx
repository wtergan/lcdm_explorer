import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

describe("Explore shell", () => {
  it("reference scenario is loaded should display export provenance", () => {
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
          step: 7,
          a: 0.715,
          z: 0.3986,
          path: "frames/density_0003.u8",
          byte_length: 2097152,
          density_std: 1.7729,
        },
      ],
    });

    render(<App initialDataset={dataset} />);

    expect(
      screen.getByText(/validated reference simulation/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/exported from lcdm_sim/i)).toBeInTheDocument();
    expect(screen.getByText(/educational model/i)).toBeInTheDocument();
    expect(screen.getByText(/a = 0.715/i)).toBeInTheDocument();
  });
});
