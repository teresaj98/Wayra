/**
 * Jest mock for react-native-config. The real module needs its native side,
 * which does not exist in Jest. Tests see the staging environment.
 */
const Config: Record<string, string | undefined> = { APP_ENV: 'staging' };

export { Config };
export default Config;
