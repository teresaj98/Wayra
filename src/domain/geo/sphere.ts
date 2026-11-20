/**
 * Spherical-earth geometry on WGS84 decimal degrees (PRD 01 D-04, R-08).
 * The sphere model is accurate to about 0.5 percent, which is well inside GPS
 * error for the distances a trip covers between two fixes.
 */

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Mean earth radius in metres (IUGG R1 rounded to 6,371 km). A physical
 * constant, not a tunable threshold, so it lives here and not in the config.
 */
export const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Normalises any angle in degrees to [0, 360). */
export function normalizeDeg(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d === 0 ? 0 : d;
}

/** Great-circle distance with the haversine formula, metres. */
export function haversineM(
  a: LatLng,
  b: LatLng,
  radiusM: number = EARTH_RADIUS_M,
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial bearing from `a` towards `b`, degrees clockwise from true north in
 * [0, 360). Returns 0 when the points are identical.
 */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/** Point reached from `origin` after `distanceM` on initial bearing `bearing`. */
export function destinationPoint(
  origin: LatLng,
  bearing: number,
  distanceM: number,
  radiusM: number = EARTH_RADIUS_M,
): LatLng {
  const delta = distanceM / radiusM;
  const theta = toRad(bearing);
  const phi1 = toRad(origin.lat);
  const lambda1 = toRad(origin.lng);
  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(sinPhi2);
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * sinPhi2,
    );
  return { lat: toDeg(phi2), lng: normalizeDeg(toDeg(lambda2) + 180) - 180 };
}

/** Sum of haversine distances along a path, metres. */
export function pathLengthM(path: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += haversineM(path[i - 1], path[i]);
  }
  return total;
}
