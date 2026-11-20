/* eslint-disable no-bitwise -- tests a bitfield. */
import { PointFlag, hasFlag } from '../../src/domain';

describe('PointFlag bitfield', () => {
  it('uses distinct bits that combine', () => {
    const flags = PointFlag.RejectedByFilter | PointFlag.Estimated;
    expect(flags).toBe(5);
    expect(hasFlag(flags, PointFlag.RejectedByFilter)).toBe(true);
    expect(hasFlag(flags, PointFlag.Estimated)).toBe(true);
    expect(hasFlag(flags, PointFlag.LowPowerSample)).toBe(false);
  });

  it('never reports the empty flag as set', () => {
    expect(hasFlag(PointFlag.None, PointFlag.None)).toBe(false);
    expect(hasFlag(7, PointFlag.None)).toBe(false);
  });
});
