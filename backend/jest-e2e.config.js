/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2021',
          parser: {
            syntax: 'typescript',
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
          keepClassNames: true,
          baseUrl: __dirname,
          paths: {
            '@/*': ['./src/*'],
          },
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  testTimeout: 600000,
  maxWorkers: 1,
  forceExit: true,
};
