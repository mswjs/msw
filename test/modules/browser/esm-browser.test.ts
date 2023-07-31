import * as path from 'path'
import { invariant } from 'outvariant'
import { createTeardown } from 'fs-teardown'
import * as express from 'express'
import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '@playwright/test'
import { spyOnConsole } from 'page-with'
import { startDevServer } from '@web/dev-server'
import { installLibrary } from '../module-utils'

type DevServer = Awaited<ReturnType<typeof startDevServer>>

const fsMock = createTeardown({
  rootDir: path.resolve(__dirname, 'esm-browser-tests'),
  paths: {
    'package.json': JSON.stringify({ type: 'module' }),
  },
})

let devServer: DevServer

function getDevServerUrl(): string {
  const address = devServer.server.address()

  invariant(address, 'Failed to retrieve dev server url: null')

  if (typeof address === 'string') {
    return new URL(address).href
  }

  return new URL(`http://localhost:${address.port}`).href
}

const httpServer = new HttpServer((app) => {
  app.use(express.static(fsMock.resolve('.')))
})

test.beforeAll(async () => {
  devServer = await startDevServer({
    config: {
      rootDir: fsMock.resolve('.'),
      port: 0,
      nodeResolve: {
        exportConditions: ['browser'],
      },
    },
    logStartMessage: false,
  })

  await httpServer.listen()
  await fsMock.prepare()
  await installLibrary(fsMock.resolve('.'))
})

test.afterAll(async () => {
  await devServer?.stop()
  await httpServer.close()
  await fsMock.cleanup()
})

test('runs in an ESM browser project', async ({ page }) => {
  await fsMock.create({
    'entry.mjs': `
import { http,HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
const worker = setupWorker(
  http.get('/resource', () => new Response()),
  http.post('/login', () => HttpResponse.json([1, 2, 3]))
)
console.log(typeof worker.start)
    `,
    'index.html': `
<script type="module" src="./entry.mjs"></script>
    `,
  })
  const consoleSpy = spyOnConsole(page)
  const pageErrors: Array<string> = []
  page.on('pageerror', (error) =>
    pageErrors.push(`${error.message}\n${error.stack}`),
  )

  await page.goto(getDevServerUrl(), { waitUntil: 'networkidle' })

  expect(pageErrors).toEqual([])
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('log')).toEqual(expect.arrayContaining(['function']))
})
