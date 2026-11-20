/**
 * Derived data (PRD 00 section 8; R-05). Disposable: always rebuildable from
 * raw points plus user edits. Field names follow the columns (DEC-S3-02).
 */
import type { JsonObject } from './json';
import type { Vehicle } from './trip';

/** Segment label (`segments.mode`). `excluded` comes from a user edit. */
export type MotionMode = 'vehicle' | 'walk' | 'stationary' | 'excluded';

export interface Segment {
  readonly tripId: string;
  readonly trackId: string;
  readonly startTs: number;
  readonly endTs: number;
  readonly mode: MotionMode;
  /** Defaults to the trip's default vehicle (D-016). */
  readonly vehicle: Vehicle;
  /** 0 to 1. How PRD 05 computes it is not decided yet. */
  readonly confidence: number;
  readonly distanceM: number;
  readonly pipelineVersion: string;
}

/** One local day of a trip (`days` row). */
export interface DayStat {
  readonly tripId: string;
  /** `YYYY-MM-DD`, from each point's own UTC offset (D-017). */
  readonly localDate: string;
  readonly startTs: number;
  readonly endTs: number;
  readonly distanceM: number;
  readonly movingS: number;
  /** Null when no point of the day has an altitude. */
  readonly maxAltM: number | null;
}

/**
 * Trip totals (`trip_stats` row). `processed_at` is not here: it is a clock
 * value, so the data layer stamps it when it saves the result (R-02, DEC-S3-04).
 */
export interface TripStats {
  readonly tripId: string;
  readonly distanceM: number;
  readonly movingS: number;
  readonly elapsedS: number;
  /** Null when no point has an altitude (honest numbers). */
  readonly maxAltM: number | null;
  readonly minAltM: number | null;
  readonly elevGainM: number;
  readonly maxSpeedMps: number;
  readonly avgMovingSpeedMps: number;
  readonly gapCount: number;
  /** Distance across gaps, reported separately from verified distance. */
  readonly estimatedDistanceM: number;
  /** Stats added later without a migration. */
  readonly extra: JsonObject;
  readonly pipelineVersion: string;
}

export type RouteScope = 'trip' | 'day';
export type RouteLod = 'thumbnail' | 'map' | 'replay';

/** A simplified route (`routes_simplified` row). */
export interface SimplifiedRoute {
  readonly tripId: string;
  readonly scope: RouteScope;
  readonly lod: RouteLod;
  /** Encoded polyline, precision 5 (see `geo/polyline`). */
  readonly polyline: string;
  readonly toleranceM: number;
  readonly pipelineVersion: string;
}
