/* eslint-disable no-bitwise -- tests bit-packed UUID fields. */
import {
  createUuidV7Generator,
  formatUuidV7,
  isUuidV7,
  uuidV7Timestamp,
  type RandomSource,
} from '../../src/domain';

const hexBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/../g)!.map(b => parseInt(b, 16)));

/** Deterministic random source: returns 0x00, 0x01, 0x02, ... */
const counting = (): RandomSource => {
  let next = 0;
  return n => Uint8Array.from({ length: n }, () => next++ & 0xff);
};

describe('formatUuidV7 (D-06)', () => {
  it('reproduces the RFC 9562 appendix A.6 example', () => {
    // unix_ts_ms 0x017F22E279B0, rand_a 0xCC3, rand_b 0x18C4DC0C0C07398F
    // (variant bits replace the top two bits of the first rand_b byte).
    const id = formatUuidV7(
      0x017f22e279b0,
      0xcc3,
      hexBytes('18c4dc0c0c07398f'),
    );
    expect(id).toBe('017F22E2-79B0-7CC3-98C4-DC0C0C07398F'.toLowerCase());
    expect(uuidV7Timestamp(id)).toBe(1_645_557_742_000);
  });

  it('always sets version 7 and variant 10', () => {
    const id = formatUuidV7(0, 0, new Uint8Array(8).fill(0xff));
    expect(id).toBe('00000000-0000-7000-bfff-ffffffffffff');
    expect(isUuidV7(id)).toBe(true);
    expect(isUuidV7(formatUuidV7(2 ** 48 - 1, 0xfff, new Uint8Array(8)))).toBe(
      true,
    );
  });

  it('rejects out-of-range parts', () => {
    const b = new Uint8Array(8);
    expect(() => formatUuidV7(-1, 0, b)).toThrow(RangeError);
    expect(() => formatUuidV7(2 ** 48, 0, b)).toThrow(RangeError);
    expect(() => formatUuidV7(1.5, 0, b)).toThrow(RangeError);
    expect(() => formatUuidV7(0, 0x1000, b)).toThrow(RangeError);
    expect(() => formatUuidV7(0, 0, new Uint8Array(7))).toThrow(RangeError);
  });

  it('validates strings and reads timestamps', () => {
    expect(isUuidV7('017f22e2-79b0-4cc3-98c4-dc0c0c07398f')).toBe(false); // v4
    expect(isUuidV7('017f22e2-79b0-7cc3-c8c4-dc0c0c07398f')).toBe(false); // variant
    expect(() => uuidV7Timestamp('not-an-id')).toThrow('Not a UUIDv7');
  });
});

describe('createUuidV7Generator (D-06)', () => {
  it('uses only the injected clock and random source', () => {
    const make = () =>
      createUuidV7Generator(() => 1_700_000_000_000, counting());
    const a = make();
    const b = make();
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('encodes the clock time', () => {
    const next = createUuidV7Generator(() => 1_763_600_000_123.9, counting());
    expect(uuidV7Timestamp(next())).toBe(1_763_600_000_123);
  });

  it('stays strictly increasing within one ms and when the clock goes back', () => {
    const times = [5000, 5000, 5000, 4000, 5001, 5001];
    let i = 0;
    const next = createUuidV7Generator(() => times[i++], counting());
    const ids = times.map(() => next());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(uuidV7Timestamp(ids[3])).toBe(5000); // clock went back: kept 5000
    expect(uuidV7Timestamp(ids[4])).toBe(5001);
  });

  it('moves the timestamp on when the counter is exhausted', () => {
    const next = createUuidV7Generator(
      () => 9000,
      n => new Uint8Array(n).fill(0xff),
    );
    const ids = Array.from({ length: 2050 }, () => next());
    expect([...ids].sort()).toEqual(ids);
    expect(uuidV7Timestamp(ids[0])).toBe(9000);
    expect(uuidV7Timestamp(ids[2049])).toBe(9001);
  });

  it('rejects a random source that returns the wrong length', () => {
    const next = createUuidV7Generator(
      () => 0,
      () => new Uint8Array(1),
    );
    expect(() => next()).toThrow('Random source returned 1 bytes, not 2');
  });
});
