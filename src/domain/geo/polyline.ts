/* eslint-disable no-bitwise -- the polyline format is defined in terms of bit shifts and masks. */
/**
 * Encoded polyline format (Google's "Encoded Polyline Algorithm Format"),
 * used for `routes_simplified.polyline` (PRD 00 section 8, PRD 01 D-04).
 * Precision 5 (1e-5 degrees, about 1 m) is the standard and the default.
 */
import type { LatLng } from './sphere';

/**
 * Highest supported precision. The encoder works on 32-bit integers, and a
 * full-range longitude delta at precision 7 would overflow them.
 */
export const MAX_POLYLINE_PRECISION = 6;

function scaleFactor(precision: number): number {
  if (
    !Number.isInteger(precision) ||
    precision < 0 ||
    precision > MAX_POLYLINE_PRECISION
  ) {
    throw new Error(
      `Polyline precision must be an integer from 0 to ${MAX_POLYLINE_PRECISION}`,
    );
  }
  return 10 ** precision;
}

/** Round half away from zero, as the reference implementation does. */
function roundHalfAway(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function encodeSigned(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(
  points: readonly LatLng[],
  precision: number = 5,
): string {
  const factor = scaleFactor(precision);
  let prevLat = 0;
  let prevLng = 0;
  let out = '';
  for (const p of points) {
    const lat = roundHalfAway(p.lat * factor);
    const lng = roundHalfAway(p.lng * factor);
    out += encodeSigned(lat - prevLat) + encodeSigned(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

/** Reads one signed value starting at `index`; returns it and the next index. */
function decodeSigned(encoded: string, index: number): [number, number] {
  let result = 0;
  let shift = 0;
  let i = index;
  let byte: number;
  do {
    if (i >= encoded.length) {
      throw new Error(`Truncated polyline at character ${i}`);
    }
    byte = encoded.charCodeAt(i) - 63;
    if (byte < 0 || byte > 0x3f) {
      throw new Error(`Invalid polyline character at ${i}`);
    }
    i += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);
  return [result & 1 ? ~(result >> 1) : result >> 1, i];
}

export function decodePolyline(
  encoded: string,
  precision: number = 5,
): LatLng[] {
  const factor = scaleFactor(precision);
  const points: LatLng[] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;
  while (i < encoded.length) {
    const [dLat, afterLat] = decodeSigned(encoded, i);
    const [dLng, afterLng] = decodeSigned(encoded, afterLat);
    lat += dLat;
    lng += dLng;
    i = afterLng;
    points.push({ lat: lat / factor, lng: lng / factor });
  }
  return points;
}
