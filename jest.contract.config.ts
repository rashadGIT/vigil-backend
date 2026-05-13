import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    'tenant-isolation\\.e2e-spec\\.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@vigil/shared-types$': '<rootDir>/../packages/shared-types/src/index.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/test'],
  testTimeout: 30000,
};

export default config;
