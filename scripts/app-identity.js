#!/usr/bin/env node
/**
 * App identity (PRD 01 F-02): app.json is the single place where the display
 * name and application IDs are defined. Native projects keep copies because
 * Gradle and Xcode need literal values; this script keeps them in sync.
 *
 *   node scripts/app-identity.js check   exit 1 if a native copy differs (part of npm run lint)
 *   node scripts/app-identity.js apply   write app.json values into the native files
 *
 * "name" in app.json is the JS component name registered in index.js and is
 * not part of the identity; do not change it.
 * The values are PLACEHOLDERS until the owner fixes them (PRD 01 OD-3, D-020).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

// Each target: file, regex with one capture group for the value, expected value.
const TARGETS = [
  {
    file: 'android/app/build.gradle',
    re: /(applicationId ")([^"]*)(")/g,
    value: app.applicationId,
  },
  {
    file: 'android/app/src/main/res/values/strings.xml',
    re: /(<string name="app_name">)([^<]*)(<\/string>)/g,
    value: app.displayName,
  },
  {
    file: 'ios/Wayra.xcodeproj/project.pbxproj',
    // Xcode writes the value quoted, CocoaPods rewrites it unquoted: accept both.
    re: /(PRODUCT_BUNDLE_IDENTIFIER = "?)([^";]*)("?;)/g,
    value: app.bundleIdentifier,
  },
  {
    file: 'ios/Wayra/Info.plist',
    re: /(<key>CFBundleDisplayName<\/key>\s*<string>)([^<]*)(<\/string>)/g,
    value: app.displayName,
  },
];

function run(mode) {
  const problems = [];
  for (const t of TARGETS) {
    const full = path.join(ROOT, t.file);
    const text = fs.readFileSync(full, 'utf8');
    const found = [...text.matchAll(t.re)].map(m => m[2]);
    if (found.length === 0) {
      problems.push(`${t.file}: pattern not found`);
      continue;
    }
    const wrong = found.filter(v => v !== t.value);
    if (wrong.length === 0) continue;
    if (mode === 'apply') {
      fs.writeFileSync(full, text.replace(t.re, `$1${t.value}$3`));
      console.log(`updated ${t.file} -> ${t.value}`);
    } else {
      problems.push(`${t.file}: has "${wrong[0]}", app.json says "${t.value}"`);
    }
  }
  if (problems.length > 0) {
    console.error('App identity check FAILED (run: npm run identity:apply):');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (mode === 'check') console.log('App identity check passed.');
}

const mode = process.argv[2];
if (mode !== 'check' && mode !== 'apply') {
  console.error('Usage: node scripts/app-identity.js check | apply');
  process.exit(1);
}
run(mode);
