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

test.afterEach(async () => {
  server.resetState()
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

test('logs incoming client events', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  server.addListener('connection', (ws) => {
    ws.send('hello from server')

    ws.addEventListener('message', (event) => {
      if (event.data === 'how are you, server?') {
        ws.send('thanks, not bad')
      }
    })
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.on('connection', ({ client, server }) => {
        server.connect()
        client.addEventListener('message', (event) => {
          server.send(event.data)
        })
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    const ws = new WebSocket(url)
    ws.addEventListener('message', (event) => {
      if (event.data === 'hello from server') {
        ws.send('how are you, server?')
      }
    })
  }, server.url)

  // Initial message sent to every connected client.
  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↓%c hello from server %c17%c color:red color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })

  // Message sent in response to a client message.
  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↓%c thanks, not bad %c15%c color:red color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs the close event initiated by the client', async ({
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
    ws.onopen = () => ws.close()
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/example\.com\/path color:blue color:inherit$/,
        ),
      ]),
    )
  })
})

test('logs the close event initiated by the event handler', async ({
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
    const worker = setupWorker(
      api.on('connection', ({ client }) => {
        client.close()
      }),
    )
    await worker.start()
  })

  await page.evaluate(() => {
    new WebSocket('wss://example.com/path')
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/example\.com\/path color:blue color:inherit$/,
        ),
      ]),
    )
  })
})
