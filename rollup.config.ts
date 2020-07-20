import * as path from 'path'
import alias from '@rollup/plugin-alias'
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

const plugins = [
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
]

/**
 * Configuration for the ESM build
 */
const buildEsm = {
  input: [
    // Split modules so they can be tree-shaken
    'src/index.ts',
    'src/rest.ts',
    'src/graphql.ts',
    'src/context/index.ts',
  ],
  output: {
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-deps.js',
    dir: path.dirname(packageJson.module),
    format: 'esm',
  },
  plugins,
}

/**
 * Configuration for the UMD build
 */
const buildUdm = {
  input: 'src/index.ts',
  output: {
    file: packageJson.main,
    name: 'MockServiceWorker',
    format: 'umd',
    esModule: false,
  },
  plugins,
}

const buildNode = {
  input: 'src/node/index.ts',
  external: [
    'http',
    'https',
    'util',
    'events',
    'tty',
    'os',
    'timers',
    'node-request-interceptor',
  ],
  output: {
    file: 'node/index.js',
    format: 'cjs',
  },
  plugins: [
    json(),
    resolve({
      browser: false,
      preferBuiltins: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        outDir: './node',
        declarationDir: './node',
      },
    }),
    commonjs(),
  ],
}

const buildNative = {
  input: 'src/native/index.ts',
  external: ['events', 'node-request-interceptor'],
  output: {
    file: 'native/index.js',
    format: 'cjs',
  },
  plugins: [
    alias({
      entries: [{ find: 'timers', replacement: '../utils/reactNativeTimers' }],
    }),
    json(),
    resolve({
      browser: false,
      preferBuiltins: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        outDir: './native',
        declarationDir: './native',
      },
    }),
    commonjs(),
  ],
}

export default [buildNode, buildNative, buildEsm, buildUdm]
