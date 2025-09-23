// config/rollup.config.js
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const external = (id) => {
  // Interno si es ruta relativa (./, ../), absoluta POSIX (/...) o absoluta Windows (C:\...).
  if (
    id.startsWith('.') ||
    id.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(id)
  ) return false;

  // Todo lo demás (imports "bare" como dotenv, pino, @playwright/test, playwright-core, etc.) es externo.
  return true;
};

module.exports = {
  input: './dist/__tmp__/index.js',
  external,
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: false },
    { file: 'dist/index.esm.js', format: 'esm', sourcemap: false }
  ],
  plugins: [
    nodeResolve({ extensions: ['.js'] }),
    commonjs()
  ],
  treeshake: true
};
