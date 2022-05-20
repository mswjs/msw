import { defineConfig } from 'tsup'

const ecosystemDependencies = /^@mswjs\/(.+)$/

export default defineConfig([
  {
    name: 'typedefs',
    entry: ['./src/index.ts', './src/node/index.ts', './src/native/index.ts'],
    outDir: './lib',
    dts: {
      only: true,
    },
  },
  {
    name: 'main',
    entry: ['./src/index.ts'],
    outDir: './lib',
    format: ['esm', 'cjs', 'iife'],
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
])
