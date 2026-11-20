/**
 * Pipeline contract (PRD 00 section 10). `runPipeline` turns raw data into
 * everything the UI shows; it is a pure function (R-02, R-16).
 */
import type {
  DayStat,
  RouteLod,
  Segment,
  SimplifiedRoute,
  TripStats,
} from './derived';
import type { RawPoint } from './points';
import type { TripMeta, UserEdit } from './trip';

/** Every threshold the pipeline uses (R-12). Values live in `config.ts`. */
export interface PipelineConfig {
  readonly clean: {
    /** Points with a worse accuracy radius are flagged, metres. */
    readonly maxAccuracyM: number;
    /** A jump needing a higher speed is physically impossible, m/s. */
    readonly maxPlausibleSpeedMps: number;
  };
  readonly smooth: {
    /** Number of points in the smoothing window (odd). */
    readonly windowSize: number;
  };
  readonly gaps: {
    /** No point for longer than this is a gap, seconds. */
    readonly maxTimeGapS: number;
    /** Consecutive points further apart than this are a gap, metres. */
    readonly maxDistanceGapM: number;
  };
  readonly motion: {
    /** At or below this speed a point counts as stationary, m/s. */
    readonly stationaryMaxSpeedMps: number;
    /** Above this speed a point counts as vehicle, m/s. */
    readonly walkMaxSpeedMps: number;
    /** A label must hold this long before it switches (hysteresis), seconds. */
    readonly minSegmentDurationS: number;
  };
  readonly stops: {
    /** Staying inside this radius counts as stopped, metres. */
    readonly radiusM: number;
    /** Shortest stop that is reported, seconds. */
    readonly minDurationS: number;
  };
  readonly days: {
    /** A stop this long can end a day, seconds. */
    readonly dayBreakMinStopS: number;
  };
  readonly simplify: {
    /** Douglas-Peucker tolerance per level of detail, metres. */
    readonly toleranceM: Readonly<Record<RouteLod, number>>;
  };
}

export interface PipelineInput {
  readonly trip: TripMeta;
  /** Sorted by ts; may contain flagged points. Never modified. */
  readonly points: readonly RawPoint[];
  /** Applied after the automatic stages. */
  readonly edits: readonly UserEdit[];
  readonly config: PipelineConfig;
  /** Fallback IANA zone, used only for points without `tzOffsetMin`. */
  readonly timezone: string;
}

export interface PipelineResult {
  readonly segments: readonly Segment[];
  readonly days: readonly DayStat[];
  readonly stats: TripStats;
  readonly simplifiedRoutes: readonly SimplifiedRoute[];
  readonly pipelineVersion: string;
  readonly warnings: readonly string[];
  /**
   * Output of stages that have no typed field yet (places, passes, scores),
   * keyed by output name, until their own PRD adds one (PRD 00 section 10).
   */
  readonly extras: Readonly<Record<string, unknown>>;
}
