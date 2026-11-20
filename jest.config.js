/**
 * Jest config with two projects (PRD 01 F-06, DEC-S3-07):
 *
 * - `node`: pure TypeScript layers (domain, data, use-cases) and the tools,
 *   in a plain Node environment with no React Native preset. Proves the domain
 *   runs unchanged in Node (R-16).
 * - `react-native`: components, screens and everything else, with React
 *   Native's preset.
 *
 * Coverage: `npm test` and `npm run test:domain` pass `--coverage`; the
 * threshold below fails the run if src/domain drops under 90 percent of lines
 * (PRD 01 AC-14).
 */
const NODE_TEST_DIRS = ['domain', 'data', 'usecases', 'tools'];

const nodeTestMatch = NODE_TEST_DIRS.flatMap(dir => [
  `<rootDir>/__tests__/${dir}/**/*.test.ts`,
  `<rootDir>/src/${dir}/**/*.test.ts`,
]);

module.exports = {
  collectCoverageFrom: ['src/domain/**/*.ts'],
  coverageThreshold: {
    // A directory key is checked as one total for the directory.
    './src/domain/': { lines: 90 },
  },
  coverageReporters: ['text-summary', 'text', 'lcov'],
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      // babel-jest with babel.config.js strips the TypeScript types.
      roots: ['<rootDir>/src', '<rootDir>/__tests__'],
      testMatch: nodeTestMatch,
    },
    {
      displayName: 'react-native',
      preset: '@react-native/jest-preset',
      // Mocks for node_modules live in src/__mocks__ (PRD 00 section 6). Jest
      // only picks them up automatically when src is one of the roots.
      roots: ['<rootDir>/src', '<rootDir>/__tests__'],
      testPathIgnorePatterns: [
        '/node_modules/',
        ...NODE_TEST_DIRS.flatMap(dir => [
          `<rootDir>/__tests__/${dir}/`,
          `<rootDir>/src/${dir}/`,
        ]),
      ],
    },
  ],
};
