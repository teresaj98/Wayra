/* eslint-disable no-bitwise -- mulberry32 is defined with 32-bit integer operations. */
/**
 * Seeded pseudo-random numbers for fixtures and tests (PRD 01 D-05). Never
 * use these for real IDs: they are predictable on purpose.
 *
 * mulberry32 by Tommy Ettinger (public domain): a 32-bit generator that is
 * small, fast and good enough for synthetic noise.
 */
export type Rng = () => number;

/** Returns a generator of floats in [0, 1), fully determined by `seed`. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal samples (mean 0, sd 1) with the Box-Muller transform. */
export function gaussian(rng: Rng): Rng {
  return () => {
    const u = 1 - rng(); // (0, 1], so log(u) is finite
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/** A UUIDv7 `RandomSource` backed by a seeded generator, for tests. */
export function seededBytes(seed: number): (count: number) => Uint8Array {
  const rng = mulberry32(seed);
  return count => Uint8Array.from({ length: count }, () => (rng() * 256) | 0);
}
