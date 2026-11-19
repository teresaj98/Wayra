/**
 * Jest config. Slice S1: one React Native project. Slice S3 splits it into a
 * Node project (domain, data, use-cases) and a React Native project (PRD 01 F-06).
 */
module.exports = {
  preset: '@react-native/jest-preset',
  // Mocks for node_modules live in src/__mocks__ (PRD 00 section 6). Jest only
  // picks them up automatically when src is one of the roots.
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
};
