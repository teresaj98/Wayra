#!/usr/bin/env node
/**
 * Writes the synthetic fixtures (PRD 01 D-05) to fixtures/*.json.
 * Usage: npm run fixtures:generate
 *
 * The generator is TypeScript in tools/fixtures and reuses the domain geo
 * helpers. @babel/register loads it with the project's babel.config.js, the
 * same transform Jest and Metro use (DEC-S3-08).
 */
require('@babel/register')({
  extensions: ['.ts', '.js'],
  only: [/[\\/](tools|src)[\\/]/],
  cache: false,
});

const { writeFileSync } = require('node:fs');
const { buildFixtures } = require('../tools/fixtures/generate');
const { serializeFixture } = require('../tools/fixtures/format');
const { fixturePath } = require('../tools/fixtures/load');

for (const fixture of buildFixtures()) {
  const file = fixturePath(fixture.name);
  writeFileSync(file, serializeFixture(fixture));
  console.log(`wrote ${file} (${fixture.points.length} points)`);
}
