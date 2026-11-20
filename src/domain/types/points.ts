/* eslint-disable no-bitwise -- `points.flags` is a bitfield (PRD 00 section 8). */
/**
 * Raw location data (PRD 00 section 8, `points` table; R-04, R-08).
 * Field names are the camelCase form of the column names, keeping the unit
 * suffix (DEC-S3-02). Times are UTC epoch milliseconds, coordinates WGS84
 * decimal degrees, distances metres, speeds metres per second.
 */

/** Motion reported by the OS activity API, if any (`points.activity_hint`). */
export type ActivityHint = 'still' | 'walking' | 'vehicle' | 'unknown';

/**
 * Bits of `points.flags` (DEC-S3-03). Combine with `|`, test with `&`.
 * The values are stored in the database, so they never change meaning.
 */
export const PointFlag = {
  None: 0,
  RejectedByFilter: 1 << 0,
  LowPowerSample: 1 << 1,
  Estimated: 1 << 2,
} as const;

/** One location fix as a recorder (or a fixture) delivers it, before ingestion. */
export interface RawFix {
  /** UTC epoch ms. */
  readonly ts: number;
  /** Device UTC offset at capture, in minutes (D-017). IST is 330. */
  readonly tzOffsetMin: number;
  readonly lat: number;
  readonly lng: number;
  /** Horizontal accuracy radius, metres. */
  readonly accuracyM: number;
  readonly speedMps: number | null;
  /** Degrees clockwise from true north, 0 to 360. */
  readonly bearingDeg: number | null;
  readonly altGpsM: number | null;
  readonly altBaroM: number | null;
  readonly activityHint: ActivityHint | null;
  /** Bitfield of {@link PointFlag}. */
  readonly flags: number;
}

/** A stored raw point: a fix plus the fields ingestion assigns (`points` row). */
export interface RawPoint extends RawFix {
  readonly id: string;
  readonly tripId: string;
  readonly trackId: string;
  /** Strictly increasing per track (DB-06). */
  readonly seq: number;
  /** UTC epoch ms when ingestion wrote the row. */
  readonly ingestedAt: number;
}

export function hasFlag(flags: number, flag: number): boolean {
  return (flags & flag) === flag && flag !== 0;
}
