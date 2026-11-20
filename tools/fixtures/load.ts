/**
 * Fixture loader for tests and tools (PRD 01 D-05). Node only: it reads files,
 * so it lives outside `src` and the domain never imports it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IdGenerator, RawPoint } from '../../src/domain';
import { parseFixture, type Fixture } from './format';

export const FIXTURE_DIR = join(__dirname, '..', '..', 'fixtures');

export const FIXTURE_NAMES = [
  'straight-line',
  'loop-with-stop',
  'noisy-with-gap',
] as const;

export type FixtureName = (typeof FIXTURE_NAMES)[number];

export function fixturePath(name: string): string {
  return join(FIXTURE_DIR, `${name}.json`);
}

/** Reads and validates `fixtures/<name>.json`. */
export function loadFixture(name: FixtureName): Fixture {
  return parseFixture(JSON.parse(readFileSync(fixturePath(name), 'utf8')));
}

export function loadAllFixtures(): Fixture[] {
  return FIXTURE_NAMES.map(loadFixture);
}

/**
 * Turns a fixture's fixes into stored points, as ingestion would (S4 owns the
 * real ingestion). Useful for pipeline tests that need `RawPoint[]`.
 */
export function toRawPoints(
  fixture: Fixture,
  opts: {
    readonly tripId: string;
    readonly trackId: string;
    readonly newId: IdGenerator;
  },
): RawPoint[] {
  const last = fixture.points[fixture.points.length - 1];
  return fixture.points.map((p, seq) => ({
    ...p,
    id: opts.newId(),
    tripId: opts.tripId,
    trackId: opts.trackId,
    seq,
    ingestedAt: last ? last.ts : 0,
  }));
}
