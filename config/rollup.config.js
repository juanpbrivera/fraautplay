// config/rollup.config.js
const typescript = require('@rollup/plugin-typescript').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const external = [
  'playwright',
  '@playwright/test', 
  'pino',
  'pino-pretty',
  'csv-parse',
  'dotenv',
  'js-yaml',
  'yaml',
  'path',
  'fs',
  'crypto',
  'util',
  'stream',
  'events',
  'os',
  'child_process'
];

module.exports = [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named'
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      json(),
      commonjs(),
      typescript({
        tsconfig: './config/tsconfig.build.json',
        declaration: false
      })
    ]
  }
];