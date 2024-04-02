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

test('does not log anything if "quiet" was set to "true"', async ({
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
    await worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://example.com/path')
    ws.onopen = () => {
      ws.send('hello')
      ws.send('world')
      queueMicrotask(() => ws.close())
    }

    return new Promise<void>((resolve, reject) => {
      ws.onclose = () => resolve()
      ws.onerror = () => reject(new Error('Client connection closed'))
    })
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
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
          /^\[MSW\] \d{2}:\d{2}:\d{2} %c▶%c wss:\/\/example\.com\/path color:#3b82f6 color:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c hello world %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c this is an extremely lon… %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c Blob\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c Blob\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c ArrayBuffer\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↑%c ArrayBuffer\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↓%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })

  // Message sent in response to a client message.
  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↓%c thanks, not bad %c15%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs raw incoming server events', async ({
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
        server.addEventListener('message', (event) => {
          event.preventDefault()
          // This is the only data the client will receive
          // but we should still print the raw server message.
          client.send('intercepted server event')
        })
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        // The actual (raw) message recieved from the server.
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from server %c17%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),

        // The mocked message sent from the event handler (client.send()).
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c intercepted server event %c24%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),

        // The actual message the client received (i.e. mocked).
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c↓%c intercepted server event %c24%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/example\.com\/path color:#3b82f6 color:inherit$/,
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/example\.com\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
  })
})

test('logs outgoing client events sent vi "server.send()"', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.on('connection', ({ server }) => {
        server.connect()
        server.send('hello from handler')
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇡%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs incoming client events sent vi "client.send()"', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.on('connection', ({ client }) => {
        client.send('hello from handler')
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
  })
})

test('logs client errors received via "client.close()"', async ({
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
        queueMicrotask(() => client.close(1003, 'Custom error'))
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
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c\u00D7%c wss:\/\/example\.com\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
  })
})

test('logs client errors received via server-sent close', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  server.on('connection', (ws) => {
    queueMicrotask(() => ws.close(1003))
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.on('connection', ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c\u00D7%c ws:\/\/(.+):\d{4,}\/ color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
  })
})
