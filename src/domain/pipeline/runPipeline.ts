/**
 * `runPipeline` (PRD 00 section 10, PRD 01 D-03). Slice S3 ships the stub:
 * all stages are identity stages, so the result is empty but valid.
 */
import type { PipelineInput, PipelineResult, TripStats } from '../types';
import {
  KNOWN_OUTPUT_KEYS,
  PIPELINE_STAGES,
  type KnownOutputKey,
  type PipelineStage,
  type PipelineState,
  type StageOutput,
} from './stages';

/** Stamped on every derived row this code produces (R-05). */
export const PIPELINE_VERSION = '0.0.0-stub';

export function emptyTripStats(
  tripId: string,
  pipelineVersion: string,
): TripStats {
  return {
    tripId,
    distanceM: 0,
    movingS: 0,
    elapsedS: 0,
    maxAltM: null,
    minAltM: null,
    elevGainM: 0,
    maxSpeedMps: 0,
    avgMovingSpeedMps: 0,
    gapCount: 0,
    estimatedDistanceM: 0,
    extra: {},
    pipelineVersion,
  };
}

function initialState(input: PipelineInput): PipelineState {
  return {
    points: input.points,
    segments: [],
    days: [],
    stats: emptyTripStats(input.trip.id, PIPELINE_VERSION),
    simplifiedRoutes: [],
    warnings: [],
    extras: {},
  };
}

function isKnownKey(key: string): key is KnownOutputKey {
  return (KNOWN_OUTPUT_KEYS as readonly string[]).includes(key);
}

/** Merges one stage's output into the state; returns a new state. */
export function mergeStageOutput(
  state: PipelineState,
  stageName: string,
  output: StageOutput,
): PipelineState {
  const known: Record<string, unknown> = {};
  const extras: Record<string, unknown> = { ...state.extras };
  const warnings: string[] = [...state.warnings];
  for (const [key, value] of Object.entries(output)) {
    if (key === 'warnings') {
      warnings.push(...((value as readonly string[] | undefined) ?? []));
    } else if (isKnownKey(key)) {
      known[key] = value;
    } else {
      if (key in extras) {
        warnings.push(
          `Stage "${stageName}" replaced extras key "${key}" set by an earlier stage`,
        );
      }
      extras[key] = value;
    }
  }
  return { ...state, ...known, warnings, extras };
}

function assertUniqueNames(stages: readonly PipelineStage[]): void {
  const seen = new Set<string>();
  for (const stage of stages) {
    if (seen.has(stage.name)) {
      throw new Error(`Duplicate pipeline stage name "${stage.name}"`);
    }
    seen.add(stage.name);
  }
}

/**
 * Runs the stages in list order. `stages` defaults to the registry; tests
 * pass their own list.
 */
export function runPipeline(
  input: PipelineInput,
  stages: readonly PipelineStage[] = PIPELINE_STAGES,
): PipelineResult {
  assertUniqueNames(stages);
  let state = initialState(input);
  for (const stage of stages) {
    state = mergeStageOutput(state, stage.name, stage.run(state, input));
  }
  return {
    segments: state.segments,
    days: state.days,
    stats: state.stats,
    simplifiedRoutes: state.simplifiedRoutes,
    pipelineVersion: PIPELINE_VERSION,
    warnings: state.warnings,
    extras: state.extras,
  };
}
