// config/rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

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

export default [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'auto'  // Importante para compatibilidad
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      json(),
      commonjs(),
      typescript({
        tsconfig: './config/tsconfig.build.json',
        declaration: false,
        outputToFilesystem: true
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
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      json(),
      typescript({
        tsconfig: './config/tsconfig.build.json',
        declaration: false,
        outputToFilesystem: true
      })
    ]
  }
];