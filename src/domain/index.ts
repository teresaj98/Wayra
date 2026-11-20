/**
 * Public surface of the pure domain layer (PRD 00 sections 5 and 10).
 * Pure TypeScript only: no React, React Native, SQLite, network, clock or
 * randomness (R-01, R-02, R-16).
 */
export * from './types';
export { pipelineConfig } from './config';
export {
  PIPELINE_VERSION,
  emptyTripStats,
  mergeStageOutput,
  runPipeline,
} from './pipeline/runPipeline';
export {
  KNOWN_OUTPUT_KEYS,
  PIPELINE_STAGES,
  PIPELINE_STAGE_NAMES,
  identityStage,
} from './pipeline/stages';
export type {
  KnownOutputKey,
  PipelineStage,
  PipelineState,
  StageOutput,
} from './pipeline/stages';
export {
  EARTH_RADIUS_M,
  bearingDeg,
  destinationPoint,
  haversineM,
  normalizeDeg,
  pathLengthM,
} from './geo/sphere';
export type { LatLng } from './geo/sphere';
export {
  MAX_POLYLINE_PRECISION,
  decodePolyline,
  encodePolyline,
} from './geo/polyline';
export {
  createUuidV7Generator,
  formatUuidV7,
  isUuidV7,
  uuidV7Timestamp,
} from './ids/uuidv7';
export type { Clock, IdGenerator, RandomSource } from './ids/uuidv7';
