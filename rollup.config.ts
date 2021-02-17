import * as path from 'path'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import typescript from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
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
    // Split modules so they can be tree-shaken.
    'src/index.ts',
    'src/rest.ts',
    'src/graphql.ts',
    'src/context/index.ts',
  ],
  output: {
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-deps.js',
    dir: path.dirname(packageJson.module),
  },
  plugins,
}

/**
 * Configuration for the UMD build
 */
const buildUmd = {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    file: packageJson.main,
    name: 'MockServiceWorker',
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
    /**
     * Exclude NodeJS request interceptors from being compiled.
     * @see https://github.com/mswjs/node-request-interceptor/issues/52
     */
    'node-request-interceptor/lib/interceptors/ClientRequest',
    'node-request-interceptor/lib/interceptors/XMLHttpRequest',
  ],
  output: {
    format: 'cjs',
    file: 'node/lib/index.js',
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
        outDir: './node/lib',
      },
    }),
    inject({
      setTimeout: ['timers', 'setTimeout'],
    }),
    commonjs(),
  ],
}

const buildNative = {
  input: 'src/native/index.ts',
  external: [
    'tty',
    'os',
    'util',
    'events',
    'node-request-interceptor',
    /**
     * Exclude NodeJS request interceptors from being compiled.
     * @see https://github.com/mswjs/node-request-interceptor/issues/52
     */
    'node-request-interceptor/lib/interceptors/ClientRequest',
    'node-request-interceptor/lib/interceptors/XMLHttpRequest',
  ],
  output: {
    file: 'native/lib/index.js',
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
        outDir: './native/lib',
      },
    }),
    commonjs(),
  ],
}

/**
 * Configuration for the iife build
 */
const buildIife = {
  input: 'src/index.ts',
  output: {
    file: 'lib/iife/index.js',
    name: 'MockServiceWorker',
    format: 'iife',
    esModule: false,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    ...plugins,
    terser(),
  ],
}

export default [buildNode, buildNative, buildEsm, buildUmd, buildIife]
