import { defineConfig, Options } from 'tsup'
import * as glob from 'glob'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/esbuild/copyWorkerPlugin'
import { resolveCoreImportsPlugin } from './config/plugins/esbuild/resolveCoreImportsPlugin'
import { forceEsmExtensionsPlugin } from './config/plugins/esbuild/forceEsmExtensionsPlugin'

// Externalize the in-house dependencies so that the user
// would get the latest published version automatically.
const ecosystemDependencies = /^@mswjs\/(.+)$/

// Externalize the core functionality (reused across environments)
// so that it can be shared between the environments.
const mswCore = /\/core(\/.+)?$/

const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

const coreConfig: Options = {
  name: 'core',
  platform: 'neutral',
  entry: glob.sync('./src/core/**/*.ts', {
    ignore: '**/*.test.ts',
  }),
  external: [ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/core',
  bundle: false,
  splitting: false,
  dts: true,
  esbuildPlugins: [forceEsmExtensionsPlugin()],
}

const nodeConfig: Options = {
  name: 'node',
  platform: 'node',
  entry: ['./src/node/index.ts'],
  inject: ['./config/polyfills-node.ts'],
  external: [mswCore, ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/node',
  sourcemap: false,
  bundle: true,
  splitting: false,
  dts: true,

  esbuildPlugins: [resolveCoreImportsPlugin(), forceEsmExtensionsPlugin()],
}

const browserConfig: Options = {
  name: 'browser',
  platform: 'browser',
  entry: ['./src/browser/index.ts'],
  external: [mswCore, ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/browser',
  bundle: true,
  splitting: false,
  dts: true,
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
  esbuildPlugins: [
    resolveCoreImportsPlugin(),
    forceEsmExtensionsPlugin(),
    copyWorkerPlugin(SERVICE_WORKER_CHECKSUM),
  ],
}

const reactNativeConfig: Options = {
  name: 'react-native',
  platform: 'node',
  entry: ['./src/native/index.ts'],
  external: ['chalk', 'util', 'events', mswCore, ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/native',
  bundle: true,
  splitting: false,
  dts: true,
  esbuildPlugins: [resolveCoreImportsPlugin(), forceEsmExtensionsPlugin()],
}

const iifeConfig: Options = {
  name: 'iife',
  platform: 'browser',
  globalName: 'MockServiceWorker',
  entry: ['./src/iife/index.ts'],
  /**
   * @note Legacy output format will automatically create
   * a "iife" directory under the "outDir".
   */
  outDir: './lib',
  format: ['iife'],
  legacyOutput: true,
  bundle: true,
  splitting: false,
  dts: false,
  define: {
    // Sign the IIFE build as well because any bundle containing
    // the worker API must have the the integrity checksum defined.
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([
  coreConfig,
  nodeConfig,
  reactNativeConfig,
  browserConfig,
  iifeConfig,
])
