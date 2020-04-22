const resolve = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const typescript = require('rollup-plugin-typescript2')
const json = require('@rollup/plugin-json')
const packageJson = require('./package.json')
const integrityCheck = require('./config/plugins/rollup-integrity-check-plugin')
const {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
} = require('./config/constants')

export default {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      name: 'MockServiceWorker',
      format: 'umd',
    },
    {
      file: packageJson.module,
      format: 'es',
    },
  ],
  plugins: [
    resolve({
      preferBuiltins: false,
      mainFields: ['module', 'main', 'jsnext:main', 'browser'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    json(),
    integrityCheck({
      checksumPlaceholder: '<INTEGRITY_CHECKSUM>',
      input: SERVICE_WORKER_SOURCE_PATH,
      output: SERVICE_WORKER_BUILD_PATH,
    }),
    commonjs(),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
  ],
}
