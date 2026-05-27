import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

describe("Explore data loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reference dataset request fails should show safe error state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    render(<App />);

    expect(screen.getByText(/preparing validated reference volumes/i)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/explore cannot begin safely/i);
    expect(screen.getByText(/unable to load reference dataset \(404\)/i)).toBeInTheDocument();
    expect(screen.getByText(/reload the page to try again/i)).toBeInTheDocument();
  });
});
