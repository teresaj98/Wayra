/**
 * ESLint flat config.
 *
 * Base: React Native's official flat config (@react-native/eslint-config/flat).
 * Architecture: eslint-plugin-boundaries enforces the layer import rules of
 * PRD 00 section 6 (rule R-01), as mapped in docs/decisions.md (DEC-S1-08).
 * scripts/check-boundaries.js proves that every rule still fails on a violation.
 */
const reactNativeConfig = require('@react-native/eslint-config/flat');
const boundaries = require('eslint-plugin-boundaries');

// Layers of PRD 00 section 6, one element per src folder.
const LAYERS = [
  'domain',
  'data',
  'services',
  'usecases',
  'store',
  'hooks',
  'screens',
  'components',
  'navigation',
  'api',
  // Shared leaves (owner decision, S1): importable by UI and app layers.
  'constants',
  'utils',
  'types',
  'locales',
  'assets',
];
const LEAVES = ['constants', 'utils', 'types', 'locales', 'assets'];

// R-01: domain imports nothing from React, React Native, native modules,
// SQLite or the network. Node core modules are blocked too (R-02, R-16).
const DOMAIN_FORBIDDEN_EXTERNALS = [
  'react',
  'react/**',
  'react-dom',
  'react-native',
  'react-native/**',
  'react-native-*',
  'react-native-*/**',
  '@react-native/**',
  '@react-native-*/**',
  '@op-engineering/**',
  '*sqlite*',
  '*sqlite*/**',
  '@*/*sqlite*',
  'axios',
  '@supabase/**',
  '@reduxjs/**',
  'react-redux',
];

// The React Native config enables Flow rules (eslint-plugin-ft-flow 2.0.3) on
// every .js file. That plugin calls context.getAllComments(), which ESLint 9
// removed, so it crashes. Wayra has no Flow code: switch those rules off.
// See docs/decisions.md DEC-S1-07.
const flowRulesOff = Object.fromEntries(
  reactNativeConfig
    .flatMap(block => Object.keys(block.rules ?? {}))
    .filter(rule => rule.startsWith('ft-flow/'))
    .map(rule => [rule, 'off']),
);

const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: to } } },
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'vendor/**',
      '.bundle/**',
    ],
  },
  ...reactNativeConfig,
  { files: ['**/*.js'], rules: flowRulesOff },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
      },
      'boundaries/elements': LAYERS.map(type => ({
        type,
        pattern: `src/${type}`,
        partialMatch: false,
      })),
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          // Without these, v7 silently skips package imports and imports of
          // local files outside any layer folder.
          checkAllOrigins: true,
          checkUnknownLocals: true,
          policies: [
            // Same-folder imports are always allowed.
            ...LAYERS.map(layer => allow(layer, [layer])),
            allow('data', ['domain']),
            allow('services', ['domain']),
            allow('usecases', ['domain', 'data', 'services', ...LEAVES]),
            allow('store', ['usecases', ...LEAVES]),
            allow('hooks', ['usecases', ...LEAVES]),
            allow('screens', ['hooks', 'store', 'components', ...LEAVES]),
            allow('components', ['hooks', 'store', ...LEAVES]),
            allow('navigation', [
              'screens',
              'components',
              'hooks',
              'store',
              ...LEAVES,
            ]),
            ...LEAVES.map(leaf => allow(leaf, LEAVES)),
            // External packages are allowed unless denied below.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: {
                  module: {
                    origin: 'external',
                    source: DOMAIN_FORBIDDEN_EXTERNALS,
                  },
                },
              },
              message:
                'R-01: domain must not import React, React Native, native modules, SQLite or network code',
            },
            {
              from: { element: { type: 'domain' } },
              disallow: { to: { module: { origin: 'core' } } },
              message:
                'R-02/R-16: domain must not import Node core modules (keep it pure and portable)',
            },
          ],
        },
      ],
    },
  },
];
