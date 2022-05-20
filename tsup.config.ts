import { defineConfig } from 'tsup'
import { workerScriptPlugin } from './config/plugins/esbuild/workerScriptPlugin'

const ecosystemDependencies = /^@mswjs\/(.+)$/

export default defineConfig([
  {
    name: 'main',
    entry: ['./src/index.ts'],
    outDir: './lib',
    format: ['esm', 'cjs', 'iife'],
    globalName: 'MockServiceWorker',
    legacyOutput: true,
    sourcemap: true,
    clean: true,
    dts: false,
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
    sourcemap: true,
    dts: false,
  },
  {
    name: 'native',
    entry: ['./src/native/index.ts'],
    format: ['esm', 'cjs'],
    outDir: './lib/native',
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
  {
    name: 'worker',
    entry: ['./src/mockServiceWorker.js'],
    outDir: './lib',
    esbuildPlugins: [workerScriptPlugin()],
  },
])
