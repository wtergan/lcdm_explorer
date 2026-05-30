import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { parseReferenceDataset } from "./data/referenceDataset";

const dataset = parseReferenceDataset({
  schema_version: 1,
  format: "lcdm-density-volume",
  scenario_id: "gallery_128",
  provenance: {
    source: "lcdm_sim",
    run_id: "run-polish",
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
      byte_length: 128 ** 3,
      density_std: 0.6,
    },
  ],
});

describe("Explorer polish controls", () => {
  it("explorer polish controls are used should show theme scale and zoom", () => {
    render(<App initialDataset={dataset} />);

    const shell = screen.getByRole("main");
    const contextPanel = screen.getByRole("complementary", {
      name: /cosmic time and provenance/i,
    });

    expect(shell).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: /experiment preview/i })).toBeVisible();
    expect(within(contextPanel).getByRole("button", { name: /sphere/i })).toBeVisible();
    expect(within(contextPanel).getByRole("button", { name: /^density$/i })).toBeVisible();
    expect(within(contextPanel).getByText(/100 mpc\/h/i)).toBeVisible();
    expect(within(contextPanel).getByText(/128 cubed voxels/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /light mode/i }));
    expect(shell).toHaveAttribute("data-theme", "light");
  });
});
