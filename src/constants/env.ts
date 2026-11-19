/**
 * Typed access to the build environment (PRD 01 F-03).
 *
 * Values come from the .env.<name> file selected at build time through
 * react-native-config (ENVFILE). Read them only through getEnv(), never through
 * react-native-config directly, so every key is validated in one place.
 */
import Config from 'react-native-config';

export const APP_ENVS = ['staging', 'uat', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export interface Env {
  appEnv: AppEnv;
}

type RawEnv = Readonly<Record<string, string | undefined>>;

function isAppEnv(value: string | undefined): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value ?? '');
}

/** Validates raw key/value pairs. Throws with a fix-it message when invalid. */
export function parseEnv(raw: RawEnv): Env {
  const appEnv = raw.APP_ENV;
  if (!isAppEnv(appEnv)) {
    throw new Error(
      `Invalid APP_ENV "${appEnv ?? ''}". Expected one of ${APP_ENVS.join(', ')}. ` +
        'Run "npm run env:init" and start the app with an npm run script (for example "npm run android").',
    );
  }
  return { appEnv };
}

let cached: Env | undefined;

/** The validated environment of this build. */
export function getEnv(): Env {
  cached ??= parseEnv(Config);
  return cached;
}
