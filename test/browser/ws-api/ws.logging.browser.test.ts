import type { ws } from 'msw'
import type { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

test('does not log anything if "quiet" was set to "true"', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => {
      ws.send('hello')
      ws.send('world')
      ws.close()
    }

    return new Promise<void>((resolve, reject) => {
      ws.onclose = () => resolve()
      ws.onerror = () => reject(new Error('Client connection closed'))
    })
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})

test('does not log anything if there are no matching event handlers', async ({
  loadExample,
  page,
  spyOnConsole,
  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.once('connection', (client) => {
    client.close()
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    // Create an event handler that doesn't match the WebSocket connection.
    const api = ws.link('wss://localhost/one')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate((serverUrl) => {
    const ws = new WebSocket(serverUrl)

    return new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = () => reject(new Error('Client connection errored'))
    })
  }, server.url)

  expect(consoleSpy.get('startGroupCollapsed')).not.toEqual(
    expect.arrayContaining([expect.stringContaining(server.url)]),
  )
})

test('logs the open event', async ({ loadExample, page, spyOnConsole }) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    new WebSocket('wss://localhost/path')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2} %c▶%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the client', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.close()
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the original server', async ({
  loadExample,
  spyOnConsole,
  page,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.on('connection', (ws) => {
    ws.close(1003)
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c ws:\/\/(.+):\d{4,}\/ color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the event handler', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(
      api.addEventListener('connection', ({ client }) => {
        client.close()
      }),
    )
    await worker.start()
  })

  await page.evaluate(() => {
    new WebSocket('wss://localhost/path')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending text', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send('hello world')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c hello world %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long text', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send('this is an extremely long sentence to log out')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c this is an extremely lon… %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending Blob', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send(new Blob(['hello world']))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c Blob\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long Blob', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () =>
      ws.send(new Blob(['this is an extremely long sentence to log out']))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c Blob\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending ArrayBuffer data', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send(new TextEncoder().encode('hello world'))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c ArrayBuffer\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long ArrayBuffer', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://localhost/*')
    const worker = setupWorker(api.addEventListener('connection', () => {}))
    await worker.start()
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () =>
      ws.send(
        new TextEncoder().encode(
          'this is an extremely long sentence to log out',
        ),
      )
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c ArrayBuffer\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs incoming server messages', async ({
  loadExample,
  page,
  spyOnConsole,
  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
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
      api.addEventListener('connection', ({ client, server }) => {
        server.connect()
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
  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )

  // Message sent in response to a client message.
  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c thanks, not bad %c15%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs raw incoming server events', async ({
  loadExample,
  page,
  spyOnConsole,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.addListener('connection', (ws) => {
    ws.send('hello from server')
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ client, server }) => {
        server.connect()

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

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        // The actual (raw) message received from the server.
        // The arrow is dotted because the message's default has been prevented.
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),

        // The mocked message sent from the event handler (client.send()).
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c intercepted server event %c24%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs mocked outgoing client message (server.send)', async ({
  loadExample,
  page,
  spyOnConsole,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
        server.send('hello from handler')
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs mocked incoming server message (client.send)', async ({
  loadExample,
  page,
  spyOnConsole,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ client }) => {
        client.send('hello from handler')
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('marks the prevented outgoing client event as dashed', async ({
  loadExample,
  page,
  spyOnConsole,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          event.preventDefault()
        })
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    const socket = new WebSocket(url)
    socket.onopen = () => socket.send('hello world')
  }, server.url)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇡%c hello world %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('marks the prevented incoming server event as dashed', async ({
  loadExample,
  page,
  spyOnConsole,

  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.addListener('connection', (ws) => {
    ws.send('hello from server')
  })

  await page.evaluate(async (url) => {
    const { setupWorker, ws } = window.msw
    const api = ws.link(url)
    const worker = setupWorker(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
        server.addEventListener('message', (event) => {
          event.preventDefault()
        })
      }),
    )
    await worker.start()
  }, server.url)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, server.url)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})
