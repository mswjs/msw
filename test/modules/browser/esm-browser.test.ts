import * as path from 'path'
import { createTeardown } from 'fs-teardown'
import { WebpackHttpServer } from 'webpack-http-server'
import { test, expect } from '@playwright/test'
import { spyOnConsole } from 'page-with'
import { installLibrary } from '../module-utils'

const fsMock = createTeardown({
  rootDir: path.resolve(__dirname, 'esm-browser-tests'),
  paths: {
    'package.json': JSON.stringify({ type: 'module' }),
  },
})

const webpackServer = new WebpackHttpServer({
  before(app) {
    app.get('/favicon.ico', (req, res) => res.status(200).end())
  },
  webpackConfig: {
    context: fsMock.resolve('.'),
    target: 'web',
    resolve: {
      extensions: ['.mjs', '.js'],
    },
  },
})

test.beforeAll(async () => {
  await webpackServer.listen()
  await fsMock.prepare()
  await installLibrary(fsMock.resolve('.'))
})

test.afterAll(async () => {
  await webpackServer.close()
  await fsMock.cleanup()
})

test('runs in an ESM browser project', async ({ page }) => {
  await fsMock.create({
    'entry.mjs': `
import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
const worker = setupWorker(
  rest.get('/resource', () => new Response()),
  rest.post('/login', () => HttpResponse.json([1, 2, 3]))
)
console.log(typeof worker.start)
    `,
  })
  const consoleSpy = spyOnConsole(page)
  const pageErrors: Array<string> = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const compilation = await webpackServer.compile(['./entry.mjs'])
  await page.goto(compilation.previewUrl, { waitUntil: 'networkidle' })

  await compilation.dispose()

  expect(pageErrors).toEqual([])
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('log')).toEqual(expect.arrayContaining(['function']))
})
