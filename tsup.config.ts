import * as path from 'node:path'
import { defineConfig, Options } from 'tsup'
import * as glob from 'glob'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/esbuild/copyWorkerPlugin'
import { resolveCoreImportsPlugin } from './config/plugins/esbuild/resolveCoreImportsPlugin'
import { forceEsmExtensionsPlugin } from './config/plugins/esbuild/forceEsmExtensionsPlugin'
import { graphqlImportPlugin } from './config/plugins/esbuild/graphQLImportPlugin'
import packageJson from './package.json'

// Externalize the in-house dependencies so that the user
// would get the latest published version automatically.
const ecosystemDependencies = /^@mswjs\/(.+)$/

// Externalize the core functionality (reused across environments)
// so that it can be shared between the environments.
const mswCore = /\/core(\/.+)?$/

const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

/**
 * A designated configuration for CJS shims.
 * This bundles the shims so CJS modules could be used
 * in the browser.
 */
const shimConfig: Options = {
  name: 'shims',
  platform: 'neutral',
  entry: glob.sync('./src/shims/**/*.ts'),
  format: ['esm', 'cjs'],
  noExternal: ['cookie'],
  outDir: './lib/shims',
  bundle: true,
  splitting: false,
  sourcemap: false,
  dts: true,
}

const coreConfig: Options = {
  name: 'core',
  platform: 'neutral',
  entry: glob.sync('./src/core/**/*.ts', {
    ignore: '**/*.test.ts',
  }),
  external: [ecosystemDependencies],
  noExternal: ['cookie'],
  format: ['esm', 'cjs'],
  outDir: './lib/core',
  bundle: false,
  splitting: false,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(__dirname, 'src/tsconfig.core.build.json'),
  esbuildPlugins: [graphqlImportPlugin(), forceEsmExtensionsPlugin()],
}

const nodeConfig: Options = {
  name: 'node',
  platform: 'node',
  entry: ['./src/node/index.ts'],
  inject: ['./config/polyfills-node.ts'],
  external: [mswCore, ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(__dirname, 'src/tsconfig.node.build.json'),
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
  sourcemap: true,
  dts: true,
  noExternal: Object.keys(packageJson.dependencies).filter((packageName) => {
    /**
     * @note Never bundle MSW core so all builds reference the *same*
     * JavaScript and TypeScript core files. This way types across
     * export paths remain compatible:
     * import { http } from 'msw' // <- core
     * import { setupWorker } from 'msw/browser' // <- /browser
     * setupWorker(http.get(path, resolver)) // OK
     */
    return !mswCore.test(packageName)
  }),
  /**
   * @note Use a proxy TypeScript configuration where the "compilerOptions.composite"
   * option is set to false.
   * @see https://github.com/egoist/tsup/issues/571
   */
  tsconfig: path.resolve(__dirname, 'src/browser/tsconfig.browser.build.json'),
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
  external: ['picocolors', 'util', 'events', mswCore, ecosystemDependencies],
  format: ['esm', 'cjs'],
  outDir: './lib/native',
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(__dirname, 'src/tsconfig.node.build.json'),
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
  sourcemap: true,
  dts: false,
  tsconfig: path.resolve(__dirname, 'src/browser/tsconfig.browser.build.json'),
  define: {
    // Sign the IIFE build as well because any bundle containing
    // the worker API must have the the integrity checksum defined.
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([
  shimConfig,
  coreConfig,
  nodeConfig,
  reactNativeConfig,
  browserConfig,
  iifeConfig,
])
