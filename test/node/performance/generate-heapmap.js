import { spawnSync } from 'node:child_process'

spawnSync('node', [new URL('./memory-usage.js', import.meta.url).pathname], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: `--expose-gc --heap-prof --heap-prof-dir=${new URL('.', import.meta.url).pathname} --heap-prof-name=${Date.now()}-msw.heapprofile`,
  },
})

spawnSync('node', [new URL('./memory-usage.js', import.meta.url).pathname], {
  stdio: 'inherit',
  env: {
    ...process.env,
    USE_NODE: 1,
    NODE_OPTIONS: `--expose-gc --heap-prof --heap-prof-dir=${new URL('.', import.meta.url).pathname} --heap-prof-name=${Date.now()}-node.heapprofile`,
  },
})
