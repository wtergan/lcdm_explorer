/**
 * Particle-position decoding for lcdm_sim export-v2 viewer assets.
 *
 * The browser renderer consumes deterministic sampled particle frames encoded
 * as little-endian uint16 periodic-box fractions. This module keeps the byte
 * contract separate from Three.js resource ownership.
 */

/**
 * Decode export-v2 particle bytes into renderer-local coordinates.
 *
 * The upstream bundle stores little-endian uint16 periodic-box fractions. The
 * viewer uses a unit cube centered at the origin, so 0 maps to -0.5 and 65535
 * maps to 0.5 on each axis.
 */
export function decodeParticlePositions(bytes: ArrayBuffer, particleCount: number) {
  const expectedBytes = particleCount * 3 * 2;
  if (bytes.byteLength !== expectedBytes) {
    throw new Error(`Expected ${expectedBytes} particle bytes`);
  }
  const source = new DataView(bytes);
  const positions = new Float32Array(particleCount * 3);
  for (let index = 0; index < positions.length; index += 1) {
    positions[index] = source.getUint16(index * 2, true) / 65535 - 0.5;
  }
  return positions;
}
