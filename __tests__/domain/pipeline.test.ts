import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_NAMES,
  PIPELINE_VERSION,
  emptyTripStats,
  pipelineConfig,
  runPipeline,
  type PipelineInput,
  type PipelineStage,
  type RawPoint,
  type TripMeta,
} from '../../src/domain';

const T0 = Date.UTC(2026, 9, 14, 3, 30);

const trip: TripMeta = {
  id: '019a0000-0000-7000-8000-000000000001',
  ownerId: null,
  name: 'Spiti circuit',
  status: 'ended',
  defaultVehicle: 'bike',
  visibility: 'private',
  startedAt: T0,
  endedAt: T0 + 60_000,
  notes: null,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
  syncedAt: null,
};

const point = (seq: number): RawPoint => ({
  id: `p${seq}`,
  tripId: trip.id,
  trackId: 't1',
  seq,
  ts: T0 + seq * 1000,
  tzOffsetMin: 330,
  lat: 32.2 + seq * 1e-4,
  lng: 78.0,
  accuracyM: 5,
  speedMps: 10,
  bearingDeg: 0,
  altGpsM: 4000,
  altBaroM: null,
  activityHint: 'vehicle',
  flags: 0,
  ingestedAt: T0 + 120_000,
});

const input = (points: RawPoint[] = []): PipelineInput => ({
  trip,
  points,
  edits: [],
  config: pipelineConfig,
  timezone: 'Asia/Kolkata',
});

/** A stage that appends its name to a trace kept in extras. */
const tracer = (name: string): PipelineStage => ({
  name,
  run: state => ({
    trace: [...((state.extras.trace as string[] | undefined) ?? []), name],
  }),
});

describe('runPipeline stub (D-03)', () => {
  it('returns an empty but valid result stamped 0.0.0-stub', () => {
    const result = runPipeline(input([point(0), point(1)]));
    expect(PIPELINE_VERSION).toBe('0.0.0-stub');
    expect(result).toEqual({
      segments: [],
      days: [],
      stats: emptyTripStats(trip.id, '0.0.0-stub'),
      simplifiedRoutes: [],
      pipelineVersion: '0.0.0-stub',
      warnings: [],
      extras: {},
    });
  });

  it('is deterministic and leaves the input untouched', () => {
    const points = [point(0), point(1)];
    const snapshot = JSON.stringify(points);
    expect(runPipeline(input(points))).toEqual(runPipeline(input(points)));
    expect(JSON.stringify(points)).toBe(snapshot);
  });

  it('registers the eight stages of PRD 00 section 10, in order', () => {
    expect(PIPELINE_STAGES.map(s => s.name)).toEqual([
      'clean',
      'smooth',
      'detect-gaps',
      'classify-motion',
      'stops-and-days',
      'stats',
      'apply-edits',
      'simplify',
    ]);
    expect(PIPELINE_STAGE_NAMES).toHaveLength(8);
    expect(Object.isFrozen(PIPELINE_STAGES)).toBe(true);
  });
});

describe('stage registry', () => {
  it('runs stages in list order', () => {
    const stages = ['a', 'b', 'c', 'd'].map(tracer);
    expect(runPipeline(input(), stages).extras.trace).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    const reversed = [...stages].reverse();
    expect(runPipeline(input(), reversed).extras.trace).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
  });

  it('puts unknown stage output into extras', () => {
    const places: PipelineStage = {
      name: 'match-places',
      run: () => ({ places: [{ name: 'Kunzum La' }], passCount: 1 }),
    };
    const result = runPipeline(input(), [...PIPELINE_STAGES, places]);
    expect(result.extras).toEqual({
      places: [{ name: 'Kunzum La' }],
      passCount: 1,
    });
    expect(result).not.toHaveProperty('places');
  });

  it('lets a stage replace a known field and see earlier output', () => {
    const stats: PipelineStage = {
      name: 'stats',
      run: state => ({
        stats: { ...state.stats, distanceM: state.points.length * 100 },
      }),
    };
    const result = runPipeline(input([point(0), point(1), point(2)]), [stats]);
    expect(result.stats.distanceM).toBe(300);
    expect(result.extras).toEqual({});
  });

  it('appends warnings from every stage', () => {
    const warn = (name: string): PipelineStage => ({
      name,
      run: () => ({ warnings: [`${name} warned`] }),
    });
    const silent: PipelineStage = {
      name: 'silent',
      run: () => ({ warnings: undefined }),
    };
    expect(
      runPipeline(input(), [warn('x'), silent, warn('y')]).warnings,
    ).toEqual(['x warned', 'y warned']);
  });

  it('warns when a later stage overwrites an extras key', () => {
    const set = (name: string, value: number): PipelineStage => ({
      name,
      run: () => ({ score: value }),
    });
    const result = runPipeline(input(), [set('first', 1), set('second', 2)]);
    expect(result.extras.score).toBe(2);
    expect(result.warnings).toEqual([
      'Stage "second" replaced extras key "score" set by an earlier stage',
    ]);
  });

  it('rejects duplicate stage names', () => {
    expect(() => runPipeline(input(), [tracer('a'), tracer('a')])).toThrow(
      'Duplicate pipeline stage name "a"',
    );
  });
});

describe('pipelineConfig (D-02)', () => {
  it('is deeply frozen', () => {
    expect(Object.isFrozen(pipelineConfig)).toBe(true);
    expect(Object.isFrozen(pipelineConfig.simplify.toleranceM)).toBe(true);
  });

  it('has consistent placeholder thresholds', () => {
    const { motion, stops, days, simplify } = pipelineConfig;
    expect(motion.stationaryMaxSpeedMps).toBeLessThan(motion.walkMaxSpeedMps);
    expect(stops.minDurationS).toBeLessThan(days.dayBreakMinStopS);
    expect(simplify.toleranceM.thumbnail).toBeGreaterThan(
      simplify.toleranceM.map,
    );
    expect(simplify.toleranceM.map).toBeGreaterThan(simplify.toleranceM.replay);
    expect(pipelineConfig.smooth.windowSize % 2).toBe(1);
  });
});
