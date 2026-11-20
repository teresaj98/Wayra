import {
  EARTH_RADIUS_M,
  MAX_POLYLINE_PRECISION,
  bearingDeg,
  decodePolyline,
  destinationPoint,
  encodePolyline,
  haversineM,
  normalizeDeg,
  pathLengthM,
} from '../../src/domain';

// Rosetta Code, "Haversine formula" task: Nashville BNA to Los Angeles LAX.
const BNA = { lat: 36.12, lng: -86.67 };
const LAX = { lat: 33.94, lng: -118.4 };

describe('haversineM (D-04)', () => {
  it('matches the published Rosetta Code values for both radii', () => {
    // Task statement: 6372.8 km -> 2887.25995060711... km
    expect(haversineM(BNA, LAX, 6_372_800)).toBeCloseTo(2_887_259.9506071, 3);
    // Task statement: 6371.0 km -> 2886.44444283798... km
    expect(haversineM(BNA, LAX)).toBeCloseTo(2_886_444.442838, 3);
    expect(EARTH_RADIUS_M).toBe(6_371_000);
  });

  it('is zero for identical points and symmetric', () => {
    expect(haversineM(BNA, BNA)).toBe(0);
    expect(haversineM(LAX, BNA)).toBeCloseTo(haversineM(BNA, LAX), 6);
  });

  it('gives a quarter of the circumference from the equator to a pole', () => {
    const quarter = (Math.PI * EARTH_RADIUS_M) / 2;
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 90, lng: 0 })).toBeCloseTo(
      quarter,
      3,
    );
    // Antipodes: half the circumference (clamped asin argument).
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(
      2 * quarter,
      3,
    );
  });

  it('sums a path', () => {
    expect(pathLengthM([])).toBe(0);
    expect(pathLengthM([BNA])).toBe(0);
    const mid = { lat: 35, lng: -100 };
    expect(pathLengthM([BNA, mid, LAX])).toBeCloseTo(
      haversineM(BNA, mid) + haversineM(mid, LAX),
      6,
    );
  });
});

describe('bearingDeg (D-04)', () => {
  const origin = { lat: 0, lng: 0 };
  it.each([
    ['north', { lat: 1, lng: 0 }, 0],
    ['east', { lat: 0, lng: 1 }, 90],
    ['south', { lat: -1, lng: 0 }, 180],
    ['west', { lat: 0, lng: -1 }, 270],
  ])('points %s', (_name, to, expected) => {
    expect(bearingDeg(origin, to)).toBeCloseTo(expected, 10);
  });

  it('is 0 for identical points and always in [0, 360)', () => {
    expect(bearingDeg(BNA, BNA)).toBe(0);
    const b = bearingDeg(BNA, LAX);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
    // LAX is west and slightly south of Nashville.
    expect(b).toBeGreaterThan(270);
    expect(b).toBeLessThan(275);
  });

  it('agrees with destinationPoint (round trip)', () => {
    const target = destinationPoint(BNA, 273.5, 100_000);
    expect(haversineM(BNA, target)).toBeCloseTo(100_000, 3);
    expect(bearingDeg(BNA, target)).toBeCloseTo(273.5, 8);
  });
});

describe('destinationPoint and normalizeDeg', () => {
  it('moves one degree of latitude along a meridian', () => {
    const oneDegree = (Math.PI * EARTH_RADIUS_M) / 180;
    const p = destinationPoint({ lat: 10, lng: 20 }, 0, oneDegree);
    expect(p.lat).toBeCloseTo(11, 10);
    expect(p.lng).toBeCloseTo(20, 10);
  });

  it('wraps longitude across the antimeridian into [-180, 180)', () => {
    const p = destinationPoint({ lat: 0, lng: 179.5 }, 90, 111_195 * 1);
    expect(p.lng).toBeCloseTo(-179.5, 3);
  });

  it('normalizes angles', () => {
    expect(normalizeDeg(0)).toBe(0);
    expect(Object.is(normalizeDeg(-0), 0)).toBe(true);
    expect(normalizeDeg(360)).toBe(0);
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(725)).toBe(5);
  });
});

describe('polyline (D-04)', () => {
  // Google, "Encoded Polyline Algorithm Format" documentation example.
  const GOOGLE_POINTS = [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ];
  const GOOGLE_ENCODED = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

  it('encodes the published Google example', () => {
    expect(encodePolyline(GOOGLE_POINTS)).toBe(GOOGLE_ENCODED);
  });

  it('decodes the published Google example', () => {
    expect(decodePolyline(GOOGLE_ENCODED)).toEqual(GOOGLE_POINTS);
  });

  it('encodes the published single value -179.9832104 as `~oia@', () => {
    // The docs encode one value; a point is lat then lng.
    expect(encodePolyline([{ lat: -179.9832104, lng: 0 }])).toBe('`~oia@?');
  });

  it('handles an empty route', () => {
    expect(encodePolyline([])).toBe('');
    expect(decodePolyline('')).toEqual([]);
  });

  it('rounds half away from zero like the reference implementation', () => {
    const [p] = decodePolyline(
      encodePolyline([{ lat: 0.000005, lng: -0.000005 }]),
    );
    expect(p).toEqual({ lat: 0.00001, lng: -0.00001 });
  });

  it('round-trips at precision 6 within 1e-6 degrees', () => {
    const route = [
      { lat: 32.2431, lng: 78.0349 },
      { lat: 32.4061234, lng: 77.6377654 },
      { lat: -33.8688197, lng: 151.2092955 },
      { lat: 89.999999, lng: -179.999999 },
    ];
    const decoded = decodePolyline(encodePolyline(route, 6), 6);
    decoded.forEach((p, i) => {
      expect(Math.abs(p.lat - route[i].lat)).toBeLessThanOrEqual(5e-7);
      expect(Math.abs(p.lng - route[i].lng)).toBeLessThanOrEqual(5e-7);
    });
  });

  it('rejects unsupported precisions and malformed input', () => {
    expect(MAX_POLYLINE_PRECISION).toBe(6);
    expect(() => encodePolyline(GOOGLE_POINTS, 7)).toThrow(/precision/);
    expect(() => decodePolyline(GOOGLE_ENCODED, 1.5)).toThrow(/precision/);
    expect(() => encodePolyline(GOOGLE_POINTS, -1)).toThrow(/precision/);
    expect(() => decodePolyline('_p~iF~ps|U_')).toThrow(/Truncated/);
    expect(() => decodePolyline('_p~iF ps|U')).toThrow(/Invalid/);
  });
});
