import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  ],
});

describe("Experiment readiness", () => {
  it("experiment is requested should explain validation gate", async () => {
    render(<App initialDataset={dataset} />);

    const trigger = screen.getByRole("button", { name: /experiment preview/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: /compute a smaller universe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close experiment preview/i })).toHaveFocus();
    expect(screen.getByText(/not live yet/i)).toBeInTheDocument();
    expect(screen.getByText(/python fixture comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/16 cubed \/ 32 cubed/i)).toBeInTheDocument();
    expect(screen.getByText(/deferred: live 64 cubed runs/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
