import { describe, expect, it } from "vitest";

import { decodeParticlePositions } from "./particlePositions";

describe("Particle position decoding", () => {
  it("particle positions are decoded should map periodic box to viewer space", () => {
    const bytes = new Uint8Array([
      0x00, 0x00, 0xff, 0xff, 0x00, 0x80,
      0x00, 0x40, 0x00, 0xc0, 0xff, 0xff,
    ]);

    const positions = decodeParticlePositions(bytes.buffer, 2);

    expect(Array.from(positions)).toEqual([
      -0.5,
      0.5,
      expect.closeTo(0.000007629510946571827, 8),
      expect.closeTo(-0.24999618530273438, 8),
      expect.closeTo(0.2500114440917969, 8),
      0.5,
    ]);
  });
});
