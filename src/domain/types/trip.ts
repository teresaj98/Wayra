/**
 * Trips, tracks and user edits (PRD 00 sections 8 and 9; D-015, D-016, R-11).
 * Field names are the camelCase form of the column names (DEC-S3-02).
 */
import type { JsonObject } from './json';

/** Extensible vehicle type (D-016). The Part 1 UI offers bike and car. */
export type Vehicle = 'bike' | 'car' | 'cycle' | 'foot' | 'other';

export type TripStatus = 'active' | 'paused' | 'ended';

/** PRD 00 only defines `private` (the default); sharing PRDs add values. */
export type TripVisibility = 'private';

export type TrackSource = 'live' | 'import-gpx' | 'import-other';

/** Sync columns every user-owned record carries (R-11). Epoch ms. */
export interface SyncColumns {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly deletedAt: number | null;
  readonly syncedAt: number | null;
}

/** A trip (`trips` row). */
export interface TripMeta extends SyncColumns {
  /** UUIDv7 (D-008). */
  readonly id: string;
  /** Null until accounts exist (Part 3). */
  readonly ownerId: string | null;
  readonly name: string;
  readonly status: TripStatus;
  readonly defaultVehicle: Vehicle;
  readonly visibility: TripVisibility;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly notes: string | null;
}

/** A track (`tracks` row). Part 1 has exactly one live track per trip. */
export interface Track {
  readonly id: string;
  readonly tripId: string;
  readonly source: TrackSource;
  readonly deviceId: string | null;
  readonly createdAt: number;
}

export type UserEditKind =
  | 'trim-start'
  | 'trim-end'
  | 'relabel-segment'
  | 'set-vehicle'
  | 'exclude-range';

/**
 * A user correction (`user_edits` row, D-007). Append-only; the latest edit
 * for the same target wins. Payload shapes are defined by PRD 07.
 */
export interface UserEdit extends SyncColumns {
  readonly id: string;
  readonly tripId: string;
  readonly kind: UserEditKind;
  readonly payload: JsonObject;
}
