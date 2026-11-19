import { APP_ENVS, getEnv, parseEnv } from '../src/constants/env';

describe('parseEnv', () => {
  it.each(APP_ENVS)('accepts APP_ENV=%s', name => {
    expect(parseEnv({ APP_ENV: name })).toEqual({ appEnv: name });
  });

  it('rejects a missing APP_ENV with a fix-it message', () => {
    expect(() => parseEnv({})).toThrow(/npm run env:init/);
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => parseEnv({ APP_ENV: 'prod' })).toThrow(
      /Invalid APP_ENV "prod"/,
    );
  });
});

describe('getEnv', () => {
  it('reads react-native-config (mocked as staging in Jest)', () => {
    expect(getEnv()).toEqual({ appEnv: 'staging' });
  });
});
