import { describe, expect, it } from "vitest";

import { clipParticlePositionsToSphere } from "./particlePositions";

describe("Sphere particle geometry", () => {
  it("particle positions are clipped should match sphere geometry", () => {
    const positions = new Float32Array([
      0, 0, 0,
      0.49, 0, 0,
      0.5, 0.5, 0.5,
      -0.49, -0.49, 0,
    ]);

    expect(clipParticlePositionsToSphere(positions)).toEqual(
      new Float32Array([
        0, 0, 0,
        0.49, 0, 0,
      ]),
    );
  });
});
