import fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type UserConfig } from 'tsdown'
import * as glob from 'glob'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/rolldown/copyWorkerPlugin.ts'
import { resolveCoreImportsPlugin } from './config/plugins/rolldown/resolveCoreImportsPlugin.ts'
import { forceFileExtensionsPlugin } from './config/plugins/rolldown/forceFileExtensionsPlugin.ts'
import { graphqlImportPlugin } from './config/plugins/rolldown/graphQLImportPlugin.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { dependencies: Record<string, string> }

const ecosystemDependencies = /^@mswjs\/(.+)$/
const mswCore = /#core(\/.+)?$/
const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

const commonConfig = {
  target: 'esnext',
  fixedExtension: false,
  hash: false,
  report: false,
  clean: false,
} satisfies UserConfig

const shimConfigs: UserConfig[] = glob
  .sync('./src/shims/**/*.ts', {
    posix: true,
    dotRelative: true,
  })
  .map((entry) => ({
    ...commonConfig,
    name: `shims:${path.basename(entry, '.ts')}`,
    platform: 'neutral',
    entry: [entry],
    format: ['esm', 'cjs'],
    deps: {
      alwaysBundle: Object.keys(packageJson.dependencies),
      onlyBundle: false,
    },
    inputOptions: {
      resolve: {
        mainFields: ['main', 'module'],
      },
    },
    outputOptions: {
      codeSplitting: false,
    },
    outDir: './lib/shims',
    unbundle: false,
    sourcemap: false,
    dts: { build: true },
  }))

const coreConfig: UserConfig = {
  ...commonConfig,
  name: 'core',
  platform: 'neutral',
  entry: glob.sync('./src/core/**/*.ts', {
    ignore: '**/*.test.ts',
    posix: true,
    dotRelative: true,
  }),
  deps: {
    neverBundle: [ecosystemDependencies, /shims\/(cookie|statuses)$/],
    onlyBundle: false,
  },
  format: {
    esm: {
      plugins: [graphqlImportPlugin(), forceFileExtensionsPlugin()],
    },
    cjs: {
      plugins: [forceFileExtensionsPlugin()],
    },
  },
  outDir: './lib/core',
  unbundle: true,
  sourcemap: true,
  dts: { build: true },
  tsconfig: path.resolve(__dirname, 'src/tsconfig.core.build.json'),
}

const nodeConfig: UserConfig = {
  ...commonConfig,
  name: 'node',
  platform: 'node',
  entry: ['./src/node/index.ts'],
  inputOptions: {
    transform: {
      inject: {
        setTimeout: ['./config/polyfills-node.ts', 'setTimeout'],
      },
    },
  },
  deps: {
    neverBundle: [mswCore, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm', 'cjs'],
  outDir: './lib/node',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: { build: true },
  tsconfig: path.resolve(__dirname, 'src/tsconfig.node.build.json'),
  plugins: [resolveCoreImportsPlugin(), forceFileExtensionsPlugin()],
}

const browserConfig: UserConfig = {
  ...commonConfig,
  name: 'browser',
  platform: 'browser',
  entry: ['./src/browser/index.ts'],
  deps: {
    neverBundle: [mswCore, ecosystemDependencies],
    alwaysBundle: Object.keys(packageJson.dependencies).filter(
      (packageName) => {
        return !mswCore.test(packageName)
      },
    ),
    onlyBundle: false,
  },
  format: ['esm', 'cjs'],
  outDir: './lib/browser',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: { build: true },
  tsconfig: path.resolve(__dirname, 'src/browser/tsconfig.browser.build.json'),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
  plugins: [
    resolveCoreImportsPlugin(),
    forceFileExtensionsPlugin(),
    copyWorkerPlugin(SERVICE_WORKER_CHECKSUM),
  ],
}

const reactNativeConfig: UserConfig = {
  ...commonConfig,
  name: 'react-native',
  platform: 'node',
  entry: ['./src/native/index.ts'],
  deps: {
    neverBundle: [
      'picocolors',
      'util',
      'events',
      mswCore,
      ecosystemDependencies,
    ],
    onlyBundle: false,
  },
  format: ['esm', 'cjs'],
  outDir: './lib/native',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: { build: true },
  tsconfig: path.resolve(__dirname, 'src/tsconfig.node.build.json'),
  plugins: [resolveCoreImportsPlugin(), forceFileExtensionsPlugin()],
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
  tsconfig: path.resolve(__dirname, 'src/browser/tsconfig.browser.build.json'),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([
  ...shimConfigs,
  coreConfig,
  nodeConfig,
  reactNativeConfig,
  browserConfig,
  iifeConfig,
])
