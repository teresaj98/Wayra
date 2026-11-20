/**
 * The single source of truth for pipeline thresholds (R-12, PRD 01 D-02).
 * Logic never hard-codes a threshold; it reads `PipelineInput.config`, which
 * callers take from here.
 *
 * PLACEHOLDER: every value below is a starting guess so the types and tests
 * have something real to hold. PRD 05 (Pipeline) sets the actual values after
 * comparing against known routes. Change them only in PRD 05 or later.
 */
import type { PipelineConfig } from './types';

function deepFreeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null) {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

export const pipelineConfig: PipelineConfig = deepFreeze({
  clean: {
    // PLACEHOLDER (PRD 05): fixes worse than 50 m are too vague to draw.
    maxAccuracyM: 50,
    // PLACEHOLDER (PRD 05): 80 m/s is 288 km/h, beyond any road vehicle.
    maxPlausibleSpeedMps: 80,
  },
  smooth: {
    // PLACEHOLDER (PRD 05): a centred window of five fixes.
    windowSize: 5,
  },
  gaps: {
    // PLACEHOLDER (PRD 05): two minutes without a fix is a gap.
    maxTimeGapS: 120,
    // PLACEHOLDER (PRD 05): a 500 m jump between fixes is a gap.
    maxDistanceGapM: 500,
  },
  motion: {
    // PLACEHOLDER (PRD 05): below 0.5 m/s (1.8 km/h) is standing still.
    stationaryMaxSpeedMps: 0.5,
    // PLACEHOLDER (PRD 05): above 2.5 m/s (9 km/h) is faster than walking.
    walkMaxSpeedMps: 2.5,
    // PLACEHOLDER (PRD 05): a label must last a minute before it switches.
    minSegmentDurationS: 60,
  },
  stops: {
    // PLACEHOLDER (PRD 05): staying within 50 m counts as stopped.
    radiusM: 50,
    // PLACEHOLDER (PRD 05): stops shorter than three minutes are ignored.
    minDurationS: 180,
  },
  days: {
    // PLACEHOLDER (PRD 05): a stop of six hours or more can end a day.
    dayBreakMinStopS: 6 * 60 * 60,
  },
  simplify: {
    // PLACEHOLDER (PRD 05): coarse for list thumbnails, fine for replay.
    toleranceM: { thumbnail: 50, map: 10, replay: 3 },
  },
});
