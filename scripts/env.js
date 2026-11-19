#!/usr/bin/env node
/**
 * Env file helper (PRD 01 F-03).
 *
 *   node scripts/env.js init           create .env.staging, .env.uat, .env.production
 *                                      from .env.example (existing files are kept)
 *   node scripts/env.js check <name>   exit 1 unless .env.<name> exists and its APP_ENV
 *                                      matches. react-native-config silently falls back
 *                                      to .env when ENVFILE is missing, so the run
 *                                      scripts call this first.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENVS = ['staging', 'uat', 'production'];
const envPath = name => path.join(ROOT, `.env.${name}`);

function readAppEnv(file) {
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find(l => /^\s*APP_ENV\s*=/.test(l));
  return line ? line.split('=')[1].trim() : undefined;
}

function init() {
  const template = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  for (const name of ENVS) {
    const file = envPath(name);
    if (fs.existsSync(file)) {
      console.log(`kept     .env.${name} (already exists)`);
      continue;
    }
    fs.writeFileSync(
      file,
      template.replace(/^APP_ENV=.*$/m, `APP_ENV=${name}`),
    );
    console.log(`created  .env.${name}`);
  }
}

function check(name) {
  if (!ENVS.includes(name)) {
    console.error(
      `Unknown environment "${name}". Use one of: ${ENVS.join(', ')}`,
    );
    process.exit(1);
  }
  const file = envPath(name);
  if (!fs.existsSync(file)) {
    console.error(`.env.${name} is missing. Run: npm run env:init`);
    process.exit(1);
  }
  const appEnv = readAppEnv(file);
  if (appEnv !== name) {
    console.error(
      `.env.${name} has APP_ENV=${appEnv ?? '(unset)'}; expected APP_ENV=${name}`,
    );
    process.exit(1);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'init') init();
else if (cmd === 'check') check(arg);
else {
  console.error(
    'Usage: node scripts/env.js init | check <staging|uat|production>',
  );
  process.exit(1);
}
