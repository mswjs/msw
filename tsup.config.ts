import { defineConfig } from 'tsup'
import { workerScriptPlugin } from './config/plugins/esbuild/workerScriptPlugin'

// Prevent from bunlding the "@mswjs/*" packages
// so that the users get the latest versions without
// having to bump them in "msw'."
const ecosystemDependencies = /^@mswjs\/(.+)$/

export default defineConfig([
  {
    name: 'main',
    entry: ['./src/index.ts'],
    outDir: './lib',
    format: ['esm', 'cjs'],
    legacyOutput: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    splitting: false,
    dts: false,
    esbuildPlugins: [workerScriptPlugin()],
  },
  {
    name: 'iife',
    entry: ['./src/index.ts'],
    outDir: './lib',
    legacyOutput: true,
    format: ['iife'],
    platform: 'browser',
    globalName: 'MockServiceWorker',
    bundle: true,
    sourcemap: true,
    splitting: false,
    dts: false,
    esbuildPlugins: [workerScriptPlugin()],
  },
  {
    name: 'node',
    entry: ['./src/node/index.ts'],
    format: ['esm', 'cjs'],
    outDir: './lib/node',
    external: [
      'http',
      'https',
      'util',
      'events',
      'tty',
      'os',
      'timers',
      ecosystemDependencies,
    ],
    clean: true,
    inject: ['./config/polyfills-node.ts'],
    sourcemap: true,
    dts: false,
    esbuildPlugins: [workerScriptPlugin()],
  },
  {
    name: 'native',
    entry: ['./src/native/index.ts'],
    format: ['esm', 'cjs'],
    outDir: './lib/native',
    clean: true,
    external: ['chalk', 'util', 'events', ecosystemDependencies],
  },
  {
    name: 'typedefs',
    entry: ['./src/index.ts', './src/node/index.ts', './src/native/index.ts'],
    outDir: './lib',
    clean: false,
    dts: {
      only: true,
    },
  },
])
