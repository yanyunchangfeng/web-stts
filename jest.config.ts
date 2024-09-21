import type { Config } from 'jest';
import { defaults as tsjPreset } from 'ts-jest/presets';

const config: Config = {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  transform: {
    ...tsjPreset.transform,
    '/test/.*\\.spec\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: { emitDecoratorMetadata: true, experimentalDecorators: true }
      }
    ],
    '.+\\.(css|styl|less|sass|scss|svg|png|jpg)$': 'jest-transform-stub' //静态资源
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  modulePathIgnorePatterns: [],
  coverageReporters: ['lcov', 'html', 'text-summary'],
  testRegex: '/test/.*\\.spec\\.tsx?$',
  collectCoverageFrom: ['src/**/*']
};

export default config;
