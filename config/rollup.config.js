// config/rollup.config.js

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const external = [
  '@playwright/test',
  'playwright',
  'pino',
  'pino-pretty',
  'csv-parse',
  'dotenv',
  'js-yaml',
  'path',
  'fs',
  'url',
  'util',
  'stream',
  'events',
  'crypto',
  'os',
  'child_process'
];

export default [
  // Build CommonJS
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
        declaration: false,
        declarationMap: false,
        outputToFilesystem: true
      })
    ]
  },
  
  // Build ES Modules
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
        declaration: false,
        declarationMap: false,
        outputToFilesystem: true
      })
    ]
  },
  
  // Bundle TypeScript declarations
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];