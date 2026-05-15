import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    'tenant-isolation\\.e2e-spec\\.ts',
    '<rootDir>/test/',
  ],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  collectCoverageFrom: [
    'src/modules/cases/cases.service.ts',
    'src/modules/intake/intake.service.ts',
    'src/modules/follow-ups/follow-ups.service.ts',
    'src/modules/n8n/n8n.service.ts',
    'src/modules/tasks/task-templates.service.ts',
    'src/modules/tasks/tasks.service.ts',
    'src/modules/auth/auth.service.ts',
    'src/modules/payments/payments.service.ts',
    'src/modules/contacts/contacts.service.ts',
    'src/modules/obituaries/obituaries.service.ts',
    'src/modules/vendors/vendors.service.ts',
    'src/modules/users/users.service.ts',
    'src/modules/price-list/price-list.service.ts',
    'src/modules/settings/settings.service.ts',
    'src/modules/referrals/referrals.service.ts',
    'src/modules/tracking/tracking.service.ts',
    'src/modules/memorial/memorial.service.ts',
    'src/modules/analytics/analytics.service.ts',
    'src/common/guards/cognito-auth.guard.ts',
    'src/common/guards/internal-only.guard.ts',
    'src/common/prisma/prisma.service.ts',
  ],
  coverageThreshold: {
    global: { branches: 55, functions: 80, lines: 80, statements: 80 },
  },
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@vigil/shared-types$': '<rootDir>/../packages/shared-types/src/index.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
};

export default config;
