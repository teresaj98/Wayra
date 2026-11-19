#!/usr/bin/env node
/**
 * Proves the layer import rules (PRD 01 F-04, PRD 00 section 6, R-01) are enforced.
 *
 * For every pair of src folders it lints a probe file that imports one from
 * the other, using the real eslint.config.js, and compares the outcome with the
 * EXPECTED table below. The table is written independently of the ESLint config
 * on purpose: if someone loosens the config, this check fails.
 *
 * Probes live in a temporary directory, never in src/. Exit code 1 on any mismatch.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ESLint } = require('eslint');

const ROOT = path.resolve(__dirname, '..');
const LEAVES = ['constants', 'utils', 'types', 'locales', 'assets'];
const UI_APP = [...LEAVES];

// from -> internal folders it may import (same folder is always allowed).
const EXPECTED = {
  domain: [],
  data: ['domain'],
  services: ['domain'],
  usecases: ['domain', 'data', 'services', ...UI_APP],
  store: ['usecases', ...UI_APP],
  hooks: ['usecases', ...UI_APP],
  screens: ['hooks', 'store', 'components', ...UI_APP],
  components: ['hooks', 'store', ...UI_APP],
  navigation: ['screens', 'components', 'hooks', 'store', ...UI_APP],
  api: [],
  constants: LEAVES,
  utils: LEAVES,
  types: LEAVES,
  locales: LEAVES,
  assets: LEAVES,
};

// External imports from domain: [specifier, allowed?]
const DOMAIN_EXTERNALS = [
  ['react', false],
  ['react-native', false],
  ['react-native-config', false],
  ['@react-native/new-app-screen', false],
  ['@op-engineering/op-sqlite', false],
  ['react-native-nitro-sqlite', false],
  ['better-sqlite3', false],
  ['axios', false],
  ['@supabase/supabase-js', false],
  ['@reduxjs/toolkit', false],
  ['fs', false],
  ['node:sqlite', false],
  ['http', false],
];

function makeSandbox() {
  // realpath: on macOS os.tmpdir() is a symlink, which breaks root-relative matching.
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'wayra-boundaries-')),
  );
  fs.symlinkSync(
    path.join(ROOT, 'node_modules'),
    path.join(dir, 'node_modules'),
  );
  for (const layer of Object.keys(EXPECTED)) {
    fs.mkdirSync(path.join(dir, 'src', layer), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'src', layer, 'probe.ts'),
      'export const probe = 1;\n',
    );
  }
  return dir;
}

async function lintImport(eslint, dir, from, specifier) {
  const filePath = path.join(dir, 'src', from, 'case.ts');
  const code = `import { probe } from '${specifier}';\nexport const value = probe;\n`;
  fs.writeFileSync(filePath, code);
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter(m => m.ruleId === 'boundaries/dependencies');
}

async function main() {
  const dir = makeSandbox();
  const previousCwd = process.cwd();
  process.chdir(dir);
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: path.join(ROOT, 'eslint.config.js'),
  });
  const failures = [];
  let checked = 0;
  try {
    for (const from of Object.keys(EXPECTED)) {
      for (const to of Object.keys(EXPECTED)) {
        const allowed = from === to || EXPECTED[from].includes(to);
        const spec = from === to ? './probe' : `../${to}/probe`;
        const errors = await lintImport(eslint, dir, from, spec);
        checked += 1;
        if (allowed === errors.length > 0) {
          failures.push(
            `${from} -> ${to}: expected ${allowed ? 'ALLOWED' : 'BLOCKED'}`,
          );
        }
      }
    }
    for (const [specifier, allowed] of DOMAIN_EXTERNALS) {
      const errors = await lintImport(eslint, dir, 'domain', specifier);
      checked += 1;
      if (allowed === errors.length > 0) {
        failures.push(
          `domain -> '${specifier}': expected ${allowed ? 'ALLOWED' : 'BLOCKED'}`,
        );
      }
    }
    // A layer may not reach files outside the layer folders (e.g. src/stray.ts).
    fs.writeFileSync(
      path.join(dir, 'src', 'stray.ts'),
      'export const probe = 1;\n',
    );
    const stray = await lintImport(eslint, dir, 'domain', '../stray');
    checked += 1;
    if (stray.length === 0)
      failures.push("domain -> 'src/stray.ts': expected BLOCKED");
    // Sanity: an allowed external import from a non-domain layer passes.
    const ok = await lintImport(eslint, dir, 'data', 'react-native');
    checked += 1;
    if (ok.length > 0)
      failures.push("data -> 'react-native': expected ALLOWED");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(
      `Import boundary check FAILED (${failures.length} of ${checked}):`,
    );
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`Import boundary check passed: ${checked} cases.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
