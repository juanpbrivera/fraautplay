// config/rollup.config.js
const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');

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
      sourcemap: true,
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
  },
  
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
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