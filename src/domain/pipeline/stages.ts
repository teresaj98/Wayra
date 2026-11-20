/**
 * Pipeline stages and the ordered registry (PRD 00 section 10, PRD 01 D-03).
 *
 * A stage is a pure function from the working state to a partial output.
 * Output keys that match a known state field replace it (`warnings` are
 * appended instead); any other key goes into `extras` under that key, so a
 * later stage (places, mountain passes, scores) can be added to the list
 * without editing existing stages or the result type.
 */
import type {
  DayStat,
  PipelineInput,
  RawPoint,
  Segment,
  SimplifiedRoute,
  TripStats,
} from '../types';

/** What stages read and write while the pipeline runs. */
export interface PipelineState {
  /** Working copy of the points; stages return new arrays, never mutate. */
  readonly points: readonly RawPoint[];
  readonly segments: readonly Segment[];
  readonly days: readonly DayStat[];
  readonly stats: TripStats;
  readonly simplifiedRoutes: readonly SimplifiedRoute[];
  readonly warnings: readonly string[];
  readonly extras: Readonly<Record<string, unknown>>;
}

/** Keys of {@link PipelineState} a stage may replace directly. */
export const KNOWN_OUTPUT_KEYS = [
  'points',
  'segments',
  'days',
  'stats',
  'simplifiedRoutes',
  'warnings',
] as const;

export type KnownOutputKey = (typeof KNOWN_OUTPUT_KEYS)[number];

export type StageOutput = Partial<Pick<PipelineState, KnownOutputKey>> &
  Readonly<Record<string, unknown>>;

export interface PipelineStage {
  readonly name: string;
  run(state: PipelineState, input: PipelineInput): StageOutput;
}

/** A stage that changes nothing. The stub registers one per slot. */
export function identityStage(name: string): PipelineStage {
  return { name, run: () => ({}) };
}

/**
 * The eight stages of PRD 00 section 10, in order. PRD 05 replaces the
 * identity stages with real ones; later PRDs append new stages here.
 */
export const PIPELINE_STAGE_NAMES = [
  'clean',
  'smooth',
  'detect-gaps',
  'classify-motion',
  'stops-and-days',
  'stats',
  'apply-edits',
  'simplify',
] as const;

export const PIPELINE_STAGES: readonly PipelineStage[] = Object.freeze(
  PIPELINE_STAGE_NAMES.map(identityStage),
);
