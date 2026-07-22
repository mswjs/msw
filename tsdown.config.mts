import fs from 'node:fs'
import * as path from 'node:path'
import { defineConfig, type UserConfig } from 'tsdown'
import * as glob from 'glob'
import {
  getWorkerChecksum,
  copyWorkerPlugin,
} from './config/plugins/rolldown/copyWorkerPlugin.ts'
import { resolveCoreImportsPlugin } from './config/plugins/rolldown/resolveCoreImportsPlugin.ts'
import { cleanStrayDeclarationsPlugin } from './config/plugins/rolldown/clean-stray-declarations-plugin.ts'

const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { dependencies: Record<string, string> }

const ecosystemDependencies = /^@mswjs\/(.+)$/
const mswCore = /#core(\/.+)?$/
const mswHttp = /#http(\/.+)?$/
const mswGraphql = /#graphql(\/.+)?$/
const mswWs = /#ws(\/.+)?$/
const SERVICE_WORKER_CHECKSUM = getWorkerChecksum()

const commonConfig = {
  target: 'esnext',
  fixedExtension: false,
  hash: false,
  report: false,
  clean: false,
} satisfies UserConfig

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
    neverBundle: [mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/core',
  unbundle: true,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.core.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
}

const graphqlConfig: UserConfig = {
  ...commonConfig,
  name: 'graphql',
  platform: 'neutral',
  entry: glob.sync('./src/graphql/**/*.ts', {
    ignore: '**/*.test.ts',
    posix: true,
    dotRelative: true,
  }),
  deps: {
    neverBundle: [mswCore, mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/graphql',
  unbundle: true,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.core.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
}

const httpConfig: UserConfig = {
  ...commonConfig,
  name: 'http',
  platform: 'neutral',
  entry: glob.sync('./src/http/**/*.ts', {
    ignore: '**/*.test.ts',
    posix: true,
    dotRelative: true,
  }),
  deps: {
    neverBundle: [mswCore, mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/http',
  unbundle: true,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.core.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
}

const wsConfig: UserConfig = {
  ...commonConfig,
  name: 'ws',
  platform: 'neutral',
  entry: glob.sync('./src/ws/**/*.ts', {
    ignore: '**/*.test.ts',
    posix: true,
    dotRelative: true,
  }),
  deps: {
    neverBundle: [mswCore, mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/ws',
  unbundle: true,
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.core.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
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
    neverBundle: [mswCore, mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/node',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.node.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
}

const browserConfig: UserConfig = {
  ...commonConfig,
  name: 'browser',
  platform: 'browser',
  entry: ['./src/browser/index.ts'],
  deps: {
    neverBundle: [mswCore, mswHttp, mswGraphql, mswWs, ecosystemDependencies],
    alwaysBundle: Object.keys(packageJson.dependencies).filter(
      (packageName) => {
        return !ecosystemDependencies.test(packageName)
      },
    ),
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/browser',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/browser/tsconfig.browser.build.json'),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
  plugins: [
    resolveCoreImportsPlugin(),
    copyWorkerPlugin(SERVICE_WORKER_CHECKSUM),
    cleanStrayDeclarationsPlugin(),
  ],
}

const reactNativeConfig: UserConfig = {
  ...commonConfig,
  name: 'react-native',
  platform: 'node',
  entry: ['./src/native/index.ts'],
  deps: {
    neverBundle: [
      'util',
      'events',
      mswCore,
      mswHttp,
      mswGraphql,
      mswWs,
      ecosystemDependencies,
    ],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: './lib/native',
  unbundle: false,
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: true,
  tsconfig: path.resolve(import.meta.dirname, 'src/tsconfig.node.build.json'),
  plugins: [
    resolveCoreImportsPlugin(),
    cleanStrayDeclarationsPlugin(),
  ],
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
  tsconfig: path.resolve(import.meta.dirname, 'src/browser/tsconfig.browser.build.json'),
  define: {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(SERVICE_WORKER_CHECKSUM),
  },
}

export default defineConfig([
  coreConfig,
  httpConfig,
  graphqlConfig,
  wsConfig,
  nodeConfig,
  reactNativeConfig,
  browserConfig,
  iifeConfig,
])
