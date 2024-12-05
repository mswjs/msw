import type { WebSocketLink, ws } from 'msw'
import type { SetupWorker, setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
    worker: SetupWorker
    link: WebSocketLink
    ws: WebSocket
    messages: string[]
  }
}

test('returns the number of active clients in the same runtime', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    window.link = api
    await worker.start()
  })

  // Must return 0 when no clients are present.
  expect(
    await page.evaluate(() => {
      return window.link.clients.size
    }),
  ).toBe(0)

  await page.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  // Must return 1 after a single client joined.
  expect(
    await page.evaluate(() => {
      return window.link.clients.size
    }),
  ).toBe(1)

  await page.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  // Must return 2 now that another client has joined.
  expect(
    await page.evaluate(() => {
      return window.link.clients.size
    }),
  ).toBe(2)
})

test('returns the number of active clients across different runtimes', async ({
  loadExample,
  context,
}) => {
  const { compilation } = await loadExample(
    require.resolve('./ws.runtime.js'),
    {
      skipActivation: true,
    },
  )

  const pageOne = await context.newPage()
  const pageTwo = await context.newPage()

  for (const page of [pageOne, pageTwo]) {
    await page.goto(compilation.previewUrl)
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const api = ws.link('wss://example.com')
      const worker = setupWorker(api.addEventListener('connection', () => {}))
      window.link = api
      await worker.start()
    })
  }

  await pageOne.bringToFront()
  await pageOne.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  expect(await pageOne.evaluate(() => window.link.clients.size)).toBe(1)
  expect(await pageTwo.evaluate(() => window.link.clients.size)).toBe(1)

  await pageTwo.bringToFront()
  await pageTwo.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  expect(await pageTwo.evaluate(() => window.link.clients.size)).toBe(2)
  expect(await pageOne.evaluate(() => window.link.clients.size)).toBe(2)
})

test('broadcasts messages across runtimes', async ({
  loadExample,
  context,
  page,
}) => {
  const { compilation } = await loadExample(
    require.resolve('./ws.runtime.js'),
    {
      skipActivation: true,
    },
  )

  const pageOne = await context.newPage()
  const pageTwo = await context.newPage()

  for (const page of [pageOne, pageTwo]) {
    await page.goto(compilation.previewUrl)
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const api = ws.link('wss://example.com')

      // @ts-ignore
      window.api = api

      const worker = setupWorker(
        api.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            api.broadcast(event.data)
          })
        }),
      )
      await worker.start()

      window.worker = worker
    })

    await page.evaluate(() => {
      window.messages = []
      const ws = new WebSocket('wss://example.com')
      window.ws = ws
      ws.onmessage = (event) => {
        window.messages.push(event.data)
      }
    })
  }

  await pageOne.evaluate(() => {
    window.ws.send('hi from one')
  })
  expect(await pageOne.evaluate(() => window.messages)).toEqual(['hi from one'])
  expect(await pageTwo.evaluate(() => window.messages)).toEqual(['hi from one'])

  await pageTwo.evaluate(() => {
    window.ws.send('hi from two')
  })

  expect(await pageTwo.evaluate(() => window.messages)).toEqual([
    'hi from one',
    'hi from two',
  ])
  expect(await pageOne.evaluate(() => window.messages)).toEqual([
    'hi from one',
    'hi from two',
  ])
})

test('clears the list of clients when the worker is stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    window.link = api
    window.worker = worker
    await worker.start()
  })

  expect(await page.evaluate(() => window.link.clients.size)).toBe(0)

  await page.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  // Must return the number of joined clients.
  expect(await page.evaluate(() => window.link.clients.size)).toBe(1)

  await page.evaluate(() => {
    window.worker.stop()
  })

  // Must purge the local storage on reload.
  // The worker has been started as a part of the test, not runtime,
  // so it will start with empty clients.
  expect(await page.evaluate(() => window.link.clients.size)).toBe(0)
})

test('clears the list of clients when the page is reloaded', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  const enableMocking = async () => {
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const api = ws.link('wss://example.com')
      const worker = setupWorker(api.addEventListener('connection', () => {}))
      window.link = api
      window.worker = worker
      await worker.start()
    })
  }

  await enableMocking()

  expect(await page.evaluate(() => window.link.clients.size)).toBe(0)

  await page.evaluate(async () => {
    const ws = new WebSocket('wss://example.com')
    await new Promise((done) => (ws.onopen = done))
  })

  // Must return the number of joined clients.
  expect(await page.evaluate(() => window.link.clients.size)).toBe(1)

  await page.reload()
  await enableMocking()

  // Must purge the local storage on reload.
  // The worker has been started as a part of the test, not runtime,
  // so it will start with empty clients.
  expect(await page.evaluate(() => window.link.clients.size)).toBe(0)
})
