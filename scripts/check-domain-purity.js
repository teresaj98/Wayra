#!/usr/bin/env node
/**
 * Self-check for the R-02 lint rules on src/domain (DEC-S3-09), in the same
 * spirit as scripts/check-boundaries.js: each probe must still be rejected
 * inside src/domain and accepted elsewhere, so loosening eslint.config.js
 * makes `npm run lint` fail.
 */
const path = require('node:path');
const { ESLint } = require('eslint');

const ROOT = path.join(__dirname, '..');

// [expression, rule that must reject it inside src/domain]
const FORBIDDEN = [
  ['Date.now()', 'no-restricted-properties'],
  ['Math.random()', 'no-restricted-properties'],
  ['new Date()', 'no-restricted-syntax'],
  ['Date()', 'no-restricted-syntax'],
  ['process.env', 'no-restricted-globals'],
  ['setTimeout(() => 0, 1)', 'no-restricted-globals'],
  ['crypto.getRandomValues(new Uint8Array(1))', 'no-restricted-globals'],
  ['fetch("https://example.invalid")', 'no-restricted-globals'],
];
const ALLOWED_IN_DOMAIN = ['Date.UTC(2026, 0, 1)', 'new Date(0).getTime()'];

async function ruleIds(eslint, expr, file) {
  const [result] = await eslint.lintText(`export const x = ${expr};\n`, {
    filePath: path.join(ROOT, file),
  });
  return result.messages.map(m => m.ruleId);
}

async function main() {
  const eslint = new ESLint({ cwd: ROOT });
  const failures = [];
  for (const [expr, rule] of FORBIDDEN) {
    if (!(await ruleIds(eslint, expr, 'src/domain/probe.ts')).includes(rule)) {
      failures.push(`${expr} is not rejected by ${rule} in src/domain`);
    }
    if ((await ruleIds(eslint, expr, 'src/data/probe.ts')).includes(rule)) {
      failures.push(`${expr} is wrongly rejected outside src/domain`);
    }
  }
  for (const expr of ALLOWED_IN_DOMAIN) {
    const ids = await ruleIds(eslint, expr, 'src/domain/probe.ts');
    if (ids.length > 0) {
      failures.push(`${expr} is wrongly rejected in src/domain (${ids})`);
    }
  }
  if (failures.length > 0) {
    console.error('Domain purity check FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  const total = FORBIDDEN.length * 2 + ALLOWED_IN_DOMAIN.length;
  console.log(`Domain purity check passed: ${total} cases.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
