import type { ws } from 'msw'
import type { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'
import { WebSocketServer } from '../../support/WebSocketServer'
import { waitFor } from '../../support/waitFor'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

const server = new WebSocketServer()

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('logs the client connection', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    new WebSocket('wss://example.com/path')
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2} %c▸%c wss:\/\/example\.com\/path color:blue color:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending text data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () => ws.send('hello world')
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c hello world %c11%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending a long text data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () => ws.send('this is an extremely long sentence to log out')
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c this is an extremely lon… %c45%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending Blob data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () => ws.send(new Blob(['hello world']))
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c Blob\(hello world\) %c11%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending a long Blob data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () =>
      ws.send(new Blob(['this is an extremely long sentence to log out']))
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c Blob\(this is an extremely lon…\) %c45%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending ArrayBuffer data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () => ws.send(new TextEncoder().encode('hello world'))
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c ArrayBuffer\(hello world\) %c11%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client event sending a long ArrayBuffer data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com/*')
    const worker = setupWorker(api.on('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () =>
      ws.send(
        new TextEncoder().encode(
          'this is an extremely long sentence to log out',
        ),
      )
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c ArrayBuffer\(this is an extremely lon…\) %c45%c color:green color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})
