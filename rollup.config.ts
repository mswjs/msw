import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import packageJson from './package.json'
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
      esModule: false,
    },
    {
      file: packageJson.module,
      format: 'es',
    },
  ],
  plugins: [
    json(),
    resolve({
      preferBuiltins: false,
      mainFields: ['module', 'main', 'jsnext:main', 'browser'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    integrityCheck({
      checksumPlaceholder: '<INTEGRITY_CHECKSUM>',
      input: SERVICE_WORKER_SOURCE_PATH,
      output: SERVICE_WORKER_BUILD_PATH,
    }),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
    commonjs(),
  ],
}
