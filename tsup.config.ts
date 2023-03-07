import { defineConfig, Options } from 'tsup'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/esbuild/copyWorkerPlugin'

// Prevent from bunlding the "@mswjs/*" packages
// so that the users get the latest versions without
// having to bump them in "msw'."
const ecosystemDependencies = /^@mswjs\/(.+)$/

const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

const nodeConfig: Options = {
  name: 'node',
  platform: 'node',
  entry: ['./src/index.ts', './src/node/index.ts'],
  inject: ['./config/polyfills-node.ts'],
  external: [ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/node',
  sourcemap: true,
  clean: true,
  bundle: true,
  splitting: false,
  dts: true,
}

const reactNativeConfig: Options = {
  name: 'react-native',
  platform: 'node',
  entry: ['./src/native/index.ts'],
  format: ['esm', 'cjs'],
  outDir: './lib/native',
  clean: true,
  bundle: true,
  splitting: false,
  external: ['chalk', 'util', 'events', ecosystemDependencies],
  dts: true,
}

const browserConfig: Options = {
  name: 'browser',
  platform: 'browser',
  entry: ['./src/browser/index.ts'],
  external: [ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/browser',
  clean: true,
  bundle: true,
  splitting: false,
  dts: true,
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
  esbuildPlugins: [copyWorkerPlugin(SERVICE_WORKER_CHECKSUM)],
}

const iifeConfig: Options = {
  name: 'iife',
  platform: 'browser',
  globalName: 'MockServiceWorker',
  entry: ['./src/browser/index.ts'],
  outDir: './lib',
  format: ['iife'],
  legacyOutput: true,
  clean: true,
  bundle: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  define: {
    // Sign the IIFE build as well because any bundle containing
    // the worker API must have the the integrity checksum defined.
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([
  nodeConfig,
  reactNativeConfig,
  browserConfig,
  iifeConfig,
])
