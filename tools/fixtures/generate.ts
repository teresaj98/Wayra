/**
 * Builds the three synthetic fixtures of PRD 01 D-05. Deterministic: fixed
 * start time, fixed seeds, no clock or Math.random. Regenerate the files with
 * `npm run fixtures:generate`; a test fails if they drift from this code.
 *
 * Tracks start near Kaza, Spiti (UTC+05:30) on 14 Oct 2026 at 09:30 local.
 * Expected stats are ground truth from the generator's parameters, not from
 * the sampled points; PRD 05 decides how close the pipeline must get.
 */
import {
  bearingDeg,
  destinationPoint,
  normalizeDeg,
  type ActivityHint,
  type LatLng,
  type RawFix,
} from '../../src/domain';
import type { Fixture } from './format';
import { gaussian, mulberry32 } from './random';

export const FIXTURE_START_TS = Date.UTC(2026, 9, 14, 4, 0, 0);
const TZ_IST_MIN = 330;
const KAZA: LatLng = { lat: 32.2276, lng: 78.0718 };
const STEP_S = 5;

const round = (value: number, digits: number): number =>
  Number(value.toFixed(digits));

interface FixInput {
  readonly tSec: number;
  readonly at: LatLng;
  readonly accuracyM: number;
  readonly speedMps: number;
  readonly bearing: number | null;
  readonly altM: number;
  readonly hint: ActivityHint;
}

function fix(f: FixInput): RawFix {
  return {
    ts: FIXTURE_START_TS + Math.round(f.tSec * 1000),
    tzOffsetMin: TZ_IST_MIN,
    lat: round(f.at.lat, 7),
    lng: round(f.at.lng, 7),
    accuracyM: round(f.accuracyM, 2),
    speedMps: round(f.speedMps, 2),
    bearingDeg: f.bearing === null ? null : round(f.bearing, 2),
    altGpsM: round(f.altM, 2),
    altBaroM: null,
    activityHint: f.hint,
    flags: 0,
  };
}

function times(durationS: number): number[] {
  return Array.from({ length: durationS / STEP_S + 1 }, (_, i) => i * STEP_S);
}

/** 10 km north-east at a constant 20 m/s (72 km/h), clean fixes. */
export function straightLine(): Fixture {
  const speed = 20;
  const heading = 45;
  const points = times(500).map(t => {
    const at = destinationPoint(KAZA, heading, speed * t);
    const ahead = destinationPoint(KAZA, heading, speed * t + 1);
    return fix({
      tSec: t,
      at,
      accuracyM: 5,
      speedMps: speed,
      bearing: bearingDeg(at, ahead),
      altM: 3800,
      hint: 'vehicle',
    });
  });
  return {
    name: 'straight-line',
    description:
      'Straight line, 10 km on initial bearing 45 deg at a constant 20 m/s, one fix every 5 s, constant altitude 3800 m, no noise.',
    expectedStats: {
      distanceM: 10_000,
      movingS: 500,
      elapsedS: 500,
      maxAltM: 3800,
      minAltM: 3800,
      elevGainM: 0,
      maxSpeedMps: 20,
      avgMovingSpeedMps: 20,
      gapCount: 0,
      estimatedDistanceM: 0,
    },
    points,
  };
}

/** A 1 km-radius loop, stopping for 10 minutes halfway round. */
export function loopWithStop(): Fixture {
  const radius = 1000;
  const movingS = 800;
  const stopAtS = 400;
  const stopS = 600;
  const circumference = 2 * Math.PI * radius;
  const speed = circumference / movingS;
  const center = destinationPoint(KAZA, 0, radius);
  const points = times(movingS + stopS).map(t => {
    const stopped = t > stopAtS && t < stopAtS + stopS;
    const movedS = t <= stopAtS ? t : Math.max(stopAtS, t - stopS);
    // Start due south of the centre and go round anticlockwise.
    const fromCenter = 180 - (360 * movedS) / movingS;
    return fix({
      tSec: t,
      at: destinationPoint(center, fromCenter, radius),
      accuracyM: 5,
      speedMps: stopped ? 0 : speed,
      bearing: stopped ? null : normalizeDeg(fromCenter - 90),
      altM: 3700,
      hint: stopped ? 'still' : 'vehicle',
    });
  });
  return {
    name: 'loop-with-stop',
    description:
      'Closed loop of radius 1 km at a constant 7.85 m/s, with a 10-minute stop (600 s, speed 0, same position) halfway round; one fix every 5 s, constant altitude 3700 m, no noise.',
    expectedStats: {
      distanceM: round(circumference, 2),
      movingS,
      elapsedS: movingS + stopS,
      maxAltM: 3700,
      minAltM: 3700,
      elevGainM: 0,
      maxSpeedMps: round(speed, 2),
      avgMovingSpeedMps: round(speed, 2),
      gapCount: 0,
      estimatedDistanceM: 0,
    },
    points,
  };
}

/** 18 km east at 15 m/s with GPS noise and a 5-minute gap (a tunnel). */
export function noisyWithGap(): Fixture {
  const speed = 15;
  const durationS = 1200;
  const gap = { fromS: 500, toS: 800 };
  const noise = gaussian(mulberry32(20261014));
  const points = times(durationS)
    .filter(t => t <= gap.fromS || t >= gap.toS)
    .map(t => {
      const truth = destinationPoint(KAZA, 90, speed * t);
      const north = destinationPoint(truth, 0, 4 * noise());
      const at = destinationPoint(north, 90, 4 * noise());
      return fix({
        tSec: t,
        at,
        accuracyM: 4 + Math.abs(3 * noise()),
        speedMps: Math.max(0, speed + 0.5 * noise()),
        bearing: 90 + 3 * noise(),
        altM: 3600 + (300 * t) / durationS + 2 * noise(),
        hint: 'vehicle',
      });
    });
  return {
    name: 'noisy-with-gap',
    description:
      'True path: 18 km due east at a constant 15 m/s, climbing steadily from 3600 m to 3900 m. Fixes every 5 s with Gaussian noise (sd 4 m per axis, 2 m altitude, 0.5 m/s speed). No fixes from 500 s to 800 s (a 300 s gap covering 4.5 km). Seed 20261014.',
    expectedStats: {
      elapsedS: durationS,
      gapCount: 1,
      estimatedDistanceM: speed * (gap.toS - gap.fromS),
    },
    points,
  };
}

export function buildFixtures(): Fixture[] {
  return [straightLine(), loopWithStop(), noisyWithGap()];
}
