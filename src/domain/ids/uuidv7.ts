/* eslint-disable no-bitwise -- UUID fields are bit-packed (RFC 9562). */
/**
 * UUIDv7 (RFC 9562 section 5.7) with an injected clock and random source
 * (PRD 01 D-06, D-008, R-02). Domain code never calls these itself: the layer
 * that creates records (data, use-cases) builds a generator from the real
 * clock and a secure random source and passes the IDs in. DEC-S3-05 explains
 * why this is our own code and not a package.
 *
 * Layout: 48-bit Unix ms timestamp | version 7 | 12-bit rand_a | variant 10 |
 * 62-bit rand_b. The generator uses rand_a as a counter within the same
 * millisecond (RFC 9562 section 6.2, method 1), so IDs from one generator
 * always sort in creation order.
 */

/** Returns the current time as UTC epoch milliseconds. */
export type Clock = () => number;

/** Returns `byteCount` random bytes (0 to 255). Use a secure source in the app. */
export type RandomSource = (byteCount: number) => Uint8Array;

export type IdGenerator = () => string;

const MAX_TIMESTAMP_MS = 2 ** 48 - 1;
const RAND_A_MAX = 0xfff;
const RAND_B_BYTES = 8;

/**
 * Formats one UUIDv7 from its parts. Pure.
 * @param unixMs  integer ms, 0 to 2^48 - 1
 * @param randA   integer, 0 to 0xfff
 * @param randB   8 bytes; the top two bits of the first byte are replaced by
 *                the variant, leaving 62 random bits
 */
export function formatUuidV7(
  unixMs: number,
  randA: number,
  randB: Uint8Array,
): string {
  if (!Number.isInteger(unixMs) || unixMs < 0 || unixMs > MAX_TIMESTAMP_MS) {
    throw new RangeError(`UUIDv7 timestamp out of range: ${unixMs}`);
  }
  if (!Number.isInteger(randA) || randA < 0 || randA > RAND_A_MAX) {
    throw new RangeError(`UUIDv7 rand_a out of range: ${randA}`);
  }
  if (randB.length !== RAND_B_BYTES) {
    throw new RangeError(`UUIDv7 rand_b needs ${RAND_B_BYTES} bytes`);
  }
  const hex = (value: number, digits: number): string =>
    value.toString(16).padStart(digits, '0');
  const ts = hex(unixMs, 12);
  const b = Array.from(randB, (byte, i) =>
    hex(i === 0 ? (byte & 0x3f) | 0x80 : byte, 2),
  ).join('');
  return [
    ts.slice(0, 8),
    ts.slice(8, 12),
    `7${hex(randA, 3)}`,
    b.slice(0, 4),
    b.slice(4, 16),
  ].join('-');
}

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidV7(value: string): boolean {
  return UUID_V7_PATTERN.test(value);
}

/** Reads the creation time (epoch ms) back out of a UUIDv7. */
export function uuidV7Timestamp(id: string): number {
  if (!isUuidV7(id)) {
    throw new Error(`Not a UUIDv7: ${id}`);
  }
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

function takeBytes(random: RandomSource, count: number): Uint8Array {
  const bytes = random(count);
  if (bytes.length !== count) {
    throw new Error(
      `Random source returned ${bytes.length} bytes, not ${count}`,
    );
  }
  return bytes;
}

/**
 * Creates a monotonic UUIDv7 generator. Within one millisecond, or if the
 * clock goes backwards, it keeps the last timestamp and increments rand_a;
 * when rand_a is exhausted it moves the timestamp on by 1 ms.
 */
export function createUuidV7Generator(
  clock: Clock,
  random: RandomSource,
): IdGenerator {
  let lastMs = -1;
  let counter = 0;
  return () => {
    const now = Math.floor(clock());
    if (now > lastMs) {
      lastMs = now;
      const seed = takeBytes(random, 2);
      // Start in the lower half so there is room to count upwards.
      counter = ((seed[0] << 8) | seed[1]) & 0x7ff;
    } else if (counter < RAND_A_MAX) {
      counter += 1;
    } else {
      lastMs += 1;
      counter = 0;
    }
    return formatUuidV7(lastMs, counter, takeBytes(random, RAND_B_BYTES));
  };
}
