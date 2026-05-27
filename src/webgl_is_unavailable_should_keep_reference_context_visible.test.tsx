import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

describe("Explore rendering fallback", () => {
  it("webgl is unavailable should keep reference context visible", async () => {
    const dataset = parseReferenceDataset({
      schema_version: 1,
      format: "lcdm-density-volume",
      scenario_id: "gallery_128",
      provenance: {
        source: "lcdm_sim",
        run_id: "run-66635bfe6a",
        config: {},
        validation: { status: "validated", summary: {} },
      },
      volume: {
        dimensions: [4, 4, 4],
        box_size_mpc_h: 100,
        units: "overdensity",
        voxel_encoding: "uint8",
        layout: "C",
        scalar_transform: {
          name: "log1p_overdensity",
          input_floor: -2,
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

    render(<App initialDataset={dataset} />);

    expect(await screen.findByText(/3d viewing unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/validated reference simulation/i),
    ).toBeInTheDocument();
  });
});
