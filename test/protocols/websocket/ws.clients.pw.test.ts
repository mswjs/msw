import type { SetupWorker, setupWorker } from 'msw/browser'
import type { WebSocketLink, ws } from 'msw/ws'
import { inlineSource, test, expect } from '../../setup/playwright'

const wsSource = inlineSource(`
import { setupWorker } from 'msw/browser'
import { ws } from 'msw/ws'

window.msw = {
  setupWorker,
  ws,
}

export { setupWorker, ws }
`)

declare global {
  interface Window {
    msw: {
      setupWorker: typeof setupWorker
      ws: typeof ws
    }
    link: WebSocketLink
    messages: Array<string>
    worker: SetupWorker
    ws: WebSocket
  }
}

test('returns the number of active clients in the same runtime', async ({
  loadExample,
  page,
}) => {
  await loadExample(wsSource, {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })
  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')
    const worker = setupWorker(service.addEventListener('connection', () => {}))
    window.link = service
    await worker.start()
  })

  expect(await page.evaluate(() => window.link.clients.size)).toBe(0)

  await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })
  await expect(
    page.waitForFunction(() => window.link.clients.size === 1),
  ).resolves.toBeTruthy()

  await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })
  await expect(
    page.waitForFunction(() => window.link.clients.size === 2),
  ).resolves.toBeTruthy()
})

test('returns the number of active clients across different runtimes', async ({
  loadExample,
  context,
}) => {
  const { compilation } = await loadExample(wsSource, {
    skipActivation: true,
  })

  const pageOne = await context.newPage()
  const pageTwo = await context.newPage()

  for (const page of [pageOne, pageTwo]) {
    await page.goto(compilation.previewUrl)
    await page.waitForFunction(() => {
      return typeof window.msw !== 'undefined'
    })
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const service = ws.link('wss://example.com')
      const worker = setupWorker(
        service.addEventListener('connection', () => {}),
      )
      window.link = service
      await worker.start()
    })
  }

  await pageOne.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })

  await expect(
    pageOne.waitForFunction(() => window.link.clients.size === 1),
  ).resolves.toBeTruthy()
  await expect(
    pageTwo.waitForFunction(() => window.link.clients.size === 1),
  ).resolves.toBeTruthy()

  await pageTwo.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })

  await expect(
    pageOne.waitForFunction(() => window.link.clients.size === 2),
  ).resolves.toBeTruthy()
  await expect(
    pageTwo.waitForFunction(() => window.link.clients.size === 2),
  ).resolves.toBeTruthy()
})

test('broadcasts messages across runtimes', async ({
  loadExample,
  context,
}) => {
  const { compilation } = await loadExample(wsSource, {
    skipActivation: true,
  })

  const pageOne = await context.newPage()
  const pageTwo = await context.newPage()

  for (const page of [pageOne, pageTwo]) {
    await page.goto(compilation.previewUrl)
    await page.waitForFunction(() => {
      return typeof window.msw !== 'undefined'
    })
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const service = ws.link('wss://example.com')
      window.link = service

      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            service.broadcast(event.data)
          })
        }),
      )
      await worker.start()

      window.messages = []
      const socket = new WebSocket('wss://example.com')
      window.ws = socket
      socket.onmessage = (event) => {
        window.messages.push(event.data)
      }
      await new Promise((resolve) => {
        socket.onopen = resolve
      })
    })
  }

  await pageOne.waitForFunction(() => window.link.clients.size === 2)
  await pageTwo.waitForFunction(() => window.link.clients.size === 2)

  await pageOne.evaluate(() => {
    window.ws.send('hi from one')
  })
  await pageOne.waitForFunction(() => window.messages.length === 1)
  await pageTwo.waitForFunction(() => window.messages.length === 1)
  await expect(pageOne.evaluate(() => window.messages)).resolves.toEqual([
    'hi from one',
  ])
  await expect(pageTwo.evaluate(() => window.messages)).resolves.toEqual([
    'hi from one',
  ])

  await pageTwo.evaluate(() => {
    window.ws.send('hi from two')
  })
  await pageOne.waitForFunction(() => window.messages.length === 2)
  await pageTwo.waitForFunction(() => window.messages.length === 2)
  await expect(pageOne.evaluate(() => window.messages)).resolves.toEqual([
    'hi from one',
    'hi from two',
  ])
  await expect(pageTwo.evaluate(() => window.messages)).resolves.toEqual([
    'hi from one',
    'hi from two',
  ])
})

test('clears the list of clients when the worker is stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(wsSource, {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })
  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')
    const worker = setupWorker(service.addEventListener('connection', () => {}))
    window.link = service
    window.worker = worker
    await worker.start()
  })

  await expect(
    page.waitForFunction(() => window.link.clients.size === 0),
  ).resolves.toBeTruthy()

  await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })
  await expect(
    page.waitForFunction(() => window.link.clients.size === 1),
  ).resolves.toBeTruthy()

  await page.evaluate(async () => {
    await window.worker.stop()
  })
  await expect(
    page.waitForFunction(() => window.link.clients.size === 0),
  ).resolves.toBeTruthy()
})

test('clears the list of clients when the page is reloaded', async ({
  loadExample,
  page,
}) => {
  await loadExample(wsSource, {
    skipActivation: true,
  })

  const enableMocking = async () => {
    await page.waitForFunction(() => {
      return typeof window.msw !== 'undefined'
    })
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const service = ws.link('wss://example.com')
      const worker = setupWorker(
        service.addEventListener('connection', () => {}),
      )
      window.link = service
      window.worker = worker
      await worker.start()
    })
  }

  await enableMocking()
  await expect(
    page.waitForFunction(() => window.link.clients.size === 0),
  ).resolves.toBeTruthy()

  await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    await new Promise((resolve) => {
      socket.onopen = resolve
    })
  })
  await expect(
    page.waitForFunction(() => window.link.clients.size === 1),
  ).resolves.toBeTruthy()

  await page.reload()
  await enableMocking()

  await expect(
    page.waitForFunction(() => window.link.clients.size === 0),
  ).resolves.toBeTruthy()
})
