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

const extensions = ['.js', '.ts']

const integrityPluginOptions = {
  checksumPlaceholder: '<INTEGRITY_CHECKSUM>',
  packageVersionPlaceholder: '<PACKAGE_VERSION>',
  input: SERVICE_WORKER_SOURCE_PATH,
  output: SERVICE_WORKER_BUILD_PATH,
}

/**
 * Exclude @mswjs/interceptors and @mswjw/cookies
 * (and any relative paths under these packages).
 * @see https://github.com/mswjs/interceptors/issues/52
 */
const mswjsRegex = /^@mswjs\/(interceptors|cookies)/

/**
 * Configuration for the ESM build.
 */
const buildEsm = {
  input: [
    // Split modules so they can be tree-shaken.
    'src/index.ts',
    'src/rest.ts',
    'src/graphql.ts',
    'src/context/index.ts',
  ],
  external: ['debug', mswjsRegex],
  output: {
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-deps.js',
    dir: path.dirname(packageJson.module),
  },
  plugins: [
    json(),
    resolve({
      preferBuiltins: false,
      mainFields: ['module', 'main', 'jsnext:main'],
      extensions,
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    integrityCheck(integrityPluginOptions),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
    commonjs(),
  ],
}

/**
 * Configuration for the UMD build.
 */
const buildUmd = {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    file: packageJson.main,
    name: 'MockServiceWorker',
    esModule: false,
  },
  plugins: [
    json(),
    replace({
      preventAssignment: false,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['browser', 'main', 'module'],
      extensions,
    }),
    integrityCheck(integrityPluginOptions),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
    commonjs(),
  ],
}

/**
 * Configuration for the Node.js (CJS) build.
 */
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
    mswjsRegex,
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
      extensions,
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

/**
 * Configuration for the React Native (CJS) build.
 */
const buildNative = {
  input: 'src/native/index.ts',
  external: ['chalk', 'util', 'events', mswjsRegex],
  output: {
    file: 'native/lib/index.js',
    format: 'cjs',
  },
  plugins: [
    json(),
    resolve({
      browser: false,
      preferBuiltins: true,
      extensions,
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
 * Configuration for the IIFE build.
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
    json(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['browser', 'module', 'main', 'jsnext:main'],
      extensions,
    }),
    integrityCheck(integrityPluginOptions),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
    commonjs(),
    terser(),
  ],
}

export default [buildNode, buildNative, buildEsm, buildUmd, buildIife]
