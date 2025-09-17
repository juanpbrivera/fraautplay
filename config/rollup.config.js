/**
 * 📦 Configuración de Rollup
 * 
 * Genera bundles optimizados del framework para distribución.
 * Soporta múltiples formatos: CommonJS, ESM, y tipos TypeScript.
 */

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { visualizer } from 'rollup-plugin-visualizer';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = require('./package.json');

// Banner para los archivos generados
const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} License.
 */`;

// Configuración de producción
const production = !process.env.ROLLUP_WATCH;

// External dependencies (no incluir en el bundle)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  '@playwright/test',
  'playwright',
  'fs',
  'path',
  'crypto',
  'util',
  'stream',
  'events',
  'child_process',
  'os',
  'url',
  'http',
  'https'
];

// Alias para paths de TypeScript
const aliasConfig = {
  entries: [
    { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
    { find: '@elements', replacement: path.resolve(__dirname, 'src/elements') },
    { find: '@interactions', replacement: path.resolve(__dirname, 'src/interactions') },
    { find: '@validations', replacement: path.resolve(__dirname, 'src/validations') },
    { find: '@utilities', replacement: path.resolve(__dirname, 'src/utilities') },
    { find: '@types', replacement: path.resolve(__dirname, 'src/types') },
    { find: '@session', replacement: path.resolve(__dirname, 'src/session') }
  ]
};

// Plugins compartidos
const plugins = [
  // Excluir peer dependencies del bundle
  peerDepsExternal(),
  
  // Resolver alias
  alias(aliasConfig),
  
  // Resolver node_modules
  resolve({
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    preferBuiltins: true,
    browser: false
  }),
  
  // Convertir CommonJS a ES6
  commonjs({
    include: 'node_modules/**'
  }),
  
  // Soporte para JSON
  json(),
  
  // Reemplazar variables de entorno
  replace({
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    'process.env.VERSION': JSON.stringify(pkg.version),
    preventAssignment: true
  }),
  
  // Compilar TypeScript
  typescript({
    tsconfig: './config/tsconfig.build.json',
    declaration: true,
    declarationDir: './dist/types',
    exclude: ['**/*.spec.ts', '**/*.test.ts']
  }),
  
  // Minificar en producción
  production && terser({
    ecma: 2020,
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/  // Minificar propiedades que empiezan con _
      }
    },
    compress: {
      module: true,
      toplevel: true,
      unsafe_arrows: true,
      drop_console: false,  // Mantener console logs
      drop_debugger: true,
      passes: 2
    },
    output: {
      comments: false,
      preamble: banner
    }
  }),
  
  // Visualizador de bundle (solo en producción)
  production && visualizer({
    filename: 'dist/stats.html',
    title: 'Web Automation Framework Bundle Analysis',
    sourcemap: true,
    gzipSize: true,
    brotliSize: true
  })
].filter(Boolean);

export default [
  // 📦 BUNDLE PRINCIPAL - CommonJS
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.main,
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'named',
      interop: 'auto'
    },
    plugins
  },
  
  // 📦 BUNDLE ESM
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.module,
      format: 'esm',
      banner,
      sourcemap: true
    },
    plugins
  },
  
  // 📦 TIPOS TypeScript
  {
    input: 'src/index.ts',
    external,
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
      banner
    },
    plugins: [
      alias(aliasConfig),
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: './src',
          paths: aliasConfig.entries.reduce((acc, entry) => {
            acc[`${entry.find}/*`] = [`${entry.replacement.replace(path.resolve(__dirname), '.')}/*`];
            return acc;
          }, {})
        }
      })
    ]
  },
  
  // 📦 BUNDLES SEPARADOS POR MÓDULO (para importación selectiva)
  ...production ? [
    // Core
    {
      input: 'src/core/index.ts',
      external,
      output: [
        {
          file: 'dist/core.js',
          format: 'cjs',
          banner,
          sourcemap: true
        },
        {
          file: 'dist/core.esm.js',
          format: 'esm',
          banner,
          sourcemap: true
        }
      ],
      plugins
    },
    
    // Elements
    {
      input: 'src/elements/index.ts',
      external,
      output: [
        {
          file: 'dist/elements.js',
          format: 'cjs',
          banner,
          sourcemap: true
        },
        {
          file: 'dist/elements.esm.js',
          format: 'esm',
          banner,
          sourcemap: true
        }
      ],
      plugins
    },
    
    // Interactions
    {
      input: 'src/interactions/index.ts',
      external,
      output: [
        {
          file: 'dist/interactions.js',
          format: 'cjs',
          banner,
          sourcemap: true
        },
        {
          file: 'dist/interactions.esm.js',
          format: 'esm',
          banner,
          sourcemap: true
        }
      ],
      plugins
    },
    
    // Validations
    {
      input: 'src/validations/index.ts',
      external,
      output: [
        {
          file: 'dist/validations.js',
          format: 'cjs',
          banner,
          sourcemap: true
        },
        {
          file: 'dist/validations.esm.js',
          format: 'esm',
          banner,
          sourcemap: true
        }
      ],
      plugins
    },
    
    // Utilities
    {
      input: 'src/utilities/index.ts',
      external,
      output: [
        {
          file: 'dist/utilities.js',
          format: 'cjs',
          banner,
          sourcemap: true
        },
        {
          file: 'dist/utilities.esm.js',
          format: 'esm',
          banner,
          sourcemap: true
        }
      ],
      plugins
    }
  ] : []
];

// Configuración para watch mode (desarrollo)
export const watch = {
  clearScreen: false,
  buildDelay: 100,
  exclude: ['node_modules/**', 'dist/**'],
  include: ['src/**/*.ts']
};