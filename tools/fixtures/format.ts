/**
 * Fixture file format (PRD 01 D-05, DEC-S3-06): one JSON object per track in
 * `fixtures/<name>.json` with the raw fixes and optional expected stats.
 */
import type { ActivityHint, RawFix, TripStats } from '../../src/domain';

/** Trip totals a fixture expects; PRD 05 sets the tolerances. */
export type ExpectedStats = Partial<
  Omit<TripStats, 'tripId' | 'extra' | 'pipelineVersion'>
>;

export interface Fixture {
  /** File name without `.json`. */
  readonly name: string;
  readonly description: string;
  readonly expectedStats?: ExpectedStats;
  /** Fixes sorted by `ts`, as a recorder would deliver them. */
  readonly points: readonly RawFix[];
}

const ACTIVITY_HINTS: readonly (ActivityHint | null)[] = [
  'still',
  'walking',
  'vehicle',
  'unknown',
  null,
];

const NUMBER_FIELDS = ['ts', 'tzOffsetMin', 'lat', 'lng', 'accuracyM', 'flags'];
const NULLABLE_NUMBER_FIELDS = [
  'speedMps',
  'bearingDeg',
  'altGpsM',
  'altBaroM',
];

function fail(name: string, message: string): never {
  throw new Error(`Fixture "${name}": ${message}`);
}

function checkFix(name: string, i: number, raw: unknown): RawFix {
  if (typeof raw !== 'object' || raw === null) {
    fail(name, `point ${i} is not an object`);
  }
  const p = raw as Record<string, unknown>;
  for (const key of NUMBER_FIELDS) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) {
      fail(name, `point ${i} field "${key}" must be a finite number`);
    }
  }
  for (const key of NULLABLE_NUMBER_FIELDS) {
    if (p[key] !== null && typeof p[key] !== 'number') {
      fail(name, `point ${i} field "${key}" must be a number or null`);
    }
  }
  if (!ACTIVITY_HINTS.includes(p.activityHint as ActivityHint | null)) {
    fail(name, `point ${i} has an unknown activityHint`);
  }
  const fix = p as unknown as RawFix;
  if (Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180) {
    fail(name, `point ${i} is outside WGS84 range`);
  }
  if (!Number.isInteger(fix.ts)) {
    fail(name, `point ${i} ts must be integer epoch ms`);
  }
  return fix;
}

/** Validates parsed JSON and returns it as a typed fixture. */
export function parseFixture(json: unknown): Fixture {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Fixture must be a JSON object');
  }
  const f = json as Record<string, unknown>;
  const name = typeof f.name === 'string' ? f.name : fail('?', 'missing name');
  if (typeof f.description !== 'string') {
    fail(name, 'missing description');
  }
  if (f.expectedStats !== undefined && typeof f.expectedStats !== 'object') {
    fail(name, 'expectedStats must be an object');
  }
  if (!Array.isArray(f.points)) {
    fail(name, 'points must be an array');
  }
  const points = f.points.map((p, i) => checkFix(name, i, p));
  points.forEach((p, i) => {
    if (i > 0 && p.ts <= points[i - 1].ts) {
      fail(name, `point ${i} is not after point ${i - 1}`);
    }
  });
  return json as Fixture;
}

/**
 * Serialises a fixture with one point per line, so diffs stay readable.
 * The generator and the up-to-date test both use this.
 */
export function serializeFixture(fixture: Fixture): string {
  const head = [
    `  "name": ${JSON.stringify(fixture.name)}`,
    `  "description": ${JSON.stringify(fixture.description)}`,
  ];
  if (fixture.expectedStats) {
    head.push(`  "expectedStats": ${JSON.stringify(fixture.expectedStats)}`);
  }
  const points = fixture.points.map(p => `    ${JSON.stringify(p)}`);
  return `{\n${head.join(',\n')},\n  "points": [\n${points.join(',\n')}\n  ]\n}\n`;
}
