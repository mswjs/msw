import fs from 'node:fs'
import * as path from 'node:path'
import { defineConfig, type UserConfig } from 'tsdown'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/rolldown/copyWorkerPlugin.ts'

const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { dependencies: Record<string, string> }

const ecosystemDependencies = /^@mswjs\/(.+)$/
const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

const commonConfig = {
  target: 'esnext',
  fixedExtension: false,
  hash: false,
  report: false,
  clean: false,
} satisfies UserConfig

const esmConfig: UserConfig = {
  ...commonConfig,
  name: 'esm',
  platform: 'neutral',
  entry: {
    'core/index': './src/core/index.ts',
    'core/experimental/index': './src/core/experimental/index.ts',
    'http/index': './src/http/index.ts',
    'graphql/index': './src/graphql/index.ts',
    'ws/index': './src/ws/index.ts',
    'node/index': './src/node/index.ts',
    'native/index': './src/native/index.ts',
    'browser/index': './src/browser/index.ts',
  },
  deps: {
    neverBundle: ['util', 'events', /^node:/, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib',
  unbundle: false,
  outputOptions: {
    entryFileNames: '[name].js',
    chunkFileNames: '_chunks/[name].js',
    codeSplitting: true,
  },
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.core.build.json'),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
  plugins: [copyWorkerPlugin(SERVICE_WORKER_CHECKSUM)],
}

const iifeConfig: UserConfig = {
  ...commonConfig,
  name: 'iife',
  platform: 'browser',
  globalName: 'MockServiceWorker',
  entry: ['./src/iife/index.ts'],
  deps: {
    alwaysBundle: [
      ...Object.keys(packageJson.dependencies),
      ecosystemDependencies,
      // The IIFE bundle re-exports "msw/graphql", so the
      // "graphql" peer dependency must be bundled with it.
      'graphql',
    ],
    onlyBundle: false,
  },
  outDir: './lib/iife',
  format: ['iife'],
  unbundle: false,
  outputOptions: {
    entryFileNames: 'index.js',
    chunkFileNames: '[name].js',
    codeSplitting: false,
  },
  sourcemap: true,
  dts: false,
  tsconfig: path.resolve(
    import.meta.dirname,
    'src/browser/tsconfig.browser.build.json',
  ),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([esmConfig, iifeConfig])

