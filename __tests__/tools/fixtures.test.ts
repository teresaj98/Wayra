import { readFileSync } from 'node:fs';
import {
  PointFlag,
  createUuidV7Generator,
  destinationPoint,
  hasFlag,
  haversineM,
  isUuidV7,
  pathLengthM,
  pipelineConfig,
  type RawFix,
} from '../../src/domain';
import { parseFixture, serializeFixture } from '../../tools/fixtures/format';
import { FIXTURE_START_TS, buildFixtures } from '../../tools/fixtures/generate';
import {
  FIXTURE_NAMES,
  fixturePath,
  loadAllFixtures,
  loadFixture,
  toRawPoints,
} from '../../tools/fixtures/load';
import { gaussian, mulberry32, seededBytes } from '../../tools/fixtures/random';

const steps = (points: readonly RawFix[]) =>
  points.slice(1).map((p, i) => ({
    dtS: (p.ts - points[i].ts) / 1000,
    distM: haversineM(points[i], p),
  }));

describe('fixture files (D-05)', () => {
  it('match the generator byte for byte (run npm run fixtures:generate)', () => {
    for (const fixture of buildFixtures()) {
      expect(readFileSync(fixturePath(fixture.name), 'utf8')).toBe(
        serializeFixture(fixture),
      );
    }
  });

  it('are deterministic: two generator runs give the same output', () => {
    expect(buildFixtures().map(serializeFixture)).toEqual(
      buildFixtures().map(serializeFixture),
    );
  });

  it('load and validate, sorted by time, starting at the fixed start time', () => {
    const all = loadAllFixtures();
    expect(all.map(f => f.name)).toEqual([...FIXTURE_NAMES]);
    for (const f of all) {
      expect(f.points[0].ts).toBe(FIXTURE_START_TS);
      expect(f.points.every(p => p.tzOffsetMin === 330)).toBe(true);
      expect(f.points.every(p => !hasFlag(p.flags, PointFlag.Estimated))).toBe(
        true,
      );
    }
  });
});

describe('straight-line', () => {
  const f = loadFixture('straight-line');

  it('covers 10 km at a constant 20 m/s', () => {
    expect(f.points).toHaveLength(101);
    expect(pathLengthM(f.points)).toBeCloseTo(f.expectedStats!.distanceM!, 0);
    for (const s of steps(f.points)) {
      expect(s.dtS).toBe(5);
      expect(s.distM / s.dtS).toBeCloseTo(20, 1);
    }
  });
});

describe('loop-with-stop', () => {
  const f = loadFixture('loop-with-stop');

  it('closes the loop and has the expected length', () => {
    const first = f.points[0];
    const last = f.points[f.points.length - 1];
    expect(haversineM(first, last)).toBeLessThan(0.1);
    // Chords are slightly shorter than the arc; within 1 m over 6.3 km.
    expect(
      Math.abs(pathLengthM(f.points) - f.expectedStats!.distanceM!),
    ).toBeLessThan(1);
  });

  it('has exactly one stop of ten minutes at one position', () => {
    const still = f.points.filter(p => p.speedMps === 0);
    expect(still.length).toBeGreaterThan(0);
    expect(still.every(p => p.activityHint === 'still')).toBe(true);
    const stopStart = f.points[f.points.indexOf(still[0]) - 1];
    const stopEnd = f.points[f.points.indexOf(still[still.length - 1]) + 1];
    expect((stopEnd.ts - stopStart.ts) / 1000).toBe(600);
    for (const p of [...still, stopEnd]) {
      expect(haversineM(stopStart, p)).toBe(0);
    }
    // One contiguous run: no moving point in between.
    const between = f.points.slice(
      f.points.indexOf(stopStart) + 1,
      f.points.indexOf(stopEnd),
    );
    expect(between).toEqual(still);
  });
});

describe('noisy-with-gap', () => {
  const f = loadFixture('noisy-with-gap');

  it('has exactly one time gap, of 300 s, longer than the config limit', () => {
    const gaps = steps(f.points).filter(
      s => s.dtS > pipelineConfig.gaps.maxTimeGapS,
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0].dtS).toBe(300);
    expect(f.expectedStats!.gapCount).toBe(1);
    // The vehicle kept moving at 15 m/s through the gap.
    expect(gaps[0].distM).toBeGreaterThan(4400);
    expect(gaps[0].distM).toBeLessThan(4600);
  });

  it('is noisy around the true path, with metre-level errors', () => {
    const start = { lat: 32.2276, lng: 78.0718 };
    const errors = f.points.map(p =>
      haversineM(
        p,
        destinationPoint(start, 90, (15 * (p.ts - f.points[0].ts)) / 1000),
      ),
    );
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    expect(mean).toBeGreaterThan(2);
    expect(mean).toBeLessThan(10);
    // Noise makes the measured path longer than the true distance.
    expect(pathLengthM(f.points)).toBeGreaterThan(18_000);
  });
});

describe('fixture parsing', () => {
  const good = loadFixture('straight-line');
  const withPoint = (patch: Record<string, unknown>) => ({
    ...good,
    points: [{ ...good.points[0], ...patch }],
  });

  it.each([
    [null, 'must be a JSON object'],
    [{ ...good, name: 1 }, 'missing name'],
    [{ ...good, description: undefined }, 'missing description'],
    [{ ...good, expectedStats: 3 }, 'expectedStats must be an object'],
    [{ ...good, points: {} }, 'points must be an array'],
    [{ ...good, points: [7] }, 'point 0 is not an object'],
    [withPoint({ lat: 'x' }), 'field "lat" must be a finite number'],
    [
      withPoint({ speedMps: 'fast' }),
      'field "speedMps" must be a number or null',
    ],
    [withPoint({ activityHint: 'flying' }), 'unknown activityHint'],
    [withPoint({ lat: 91 }), 'outside WGS84 range'],
    [withPoint({ ts: 1.5 }), 'ts must be integer epoch ms'],
    [
      { ...good, points: [good.points[1], good.points[0]] },
      'point 1 is not after point 0',
    ],
  ])('rejects bad input %#', (json, message) => {
    expect(() => parseFixture(json)).toThrow(message);
  });

  it('accepts a fixture without expected stats', () => {
    const bare = { ...good, expectedStats: undefined };
    expect(parseFixture(bare).expectedStats).toBeUndefined();
    expect(serializeFixture(bare)).not.toContain('expectedStats');
  });
});

describe('toRawPoints and seeded randomness', () => {
  it('assigns UUIDv7 ids, trip, track and an increasing seq', () => {
    const f = loadFixture('loop-with-stop');
    const newId = createUuidV7Generator(() => FIXTURE_START_TS, seededBytes(1));
    const points = toRawPoints(f, { tripId: 'trip', trackId: 'track', newId });
    expect(points).toHaveLength(f.points.length);
    expect(points.map(p => p.seq)).toEqual(points.map((_, i) => i));
    expect(points.every(p => isUuidV7(p.id) && p.tripId === 'trip')).toBe(true);
    expect(new Set(points.map(p => p.id)).size).toBe(points.length);
    expect(points[0]).toMatchObject(f.points[0]);
  });

  it('repeats the same sequence for the same seed', () => {
    const a = gaussian(mulberry32(42));
    const b = gaussian(mulberry32(42));
    const sa = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(sa);
    expect(Array.from({ length: 5 }, gaussian(mulberry32(43)))).not.toEqual(sa);
    expect(seededBytes(7)(4)).toEqual(seededBytes(7)(4));
  });
});
