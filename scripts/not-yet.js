#!/usr/bin/env node
/**
 * Placeholder for scripts that PRD 01 F-09 names but a later slice implements.
 * Prints a clear SKIPPED message and exits 0 so the script name is stable now.
 * Usage: node scripts/not-yet.js <script> <slice> <requirement>
 */
const [script, slice, requirement] = process.argv.slice(2);
console.log(
  `SKIPPED: "${script}" is not implemented yet. It arrives in slice ${slice} (PRD 01 ${requirement}).`,
);
