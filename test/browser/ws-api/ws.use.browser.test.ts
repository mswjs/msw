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

test('resolves outgoing events using initial handlers', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('hello from mock')
          }
        })
      }),
    )
    await worker.start()
  })

  const clientMessage = await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    return new Promise((resolve, reject) => {
      socket.onopen = () => socket.send('hello')
      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = reject
    })
  })

  expect(clientMessage).toBe('hello from mock')
})

test('overrides an outgoing event listener', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('must not be sent')
          }
        })
      }),
    )
    await worker.start()

    worker.use(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            event.stopImmediatePropagation()
            client.send('howdy, client!')
          }
        })
      }),
    )
  })

  const clientMessage = await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    return new Promise((resolve, reject) => {
      socket.onopen = () => socket.send('hello')

      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = reject
    })
  })

  expect(clientMessage).toBe('howdy, client!')
})

test('combines initial and override listeners', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // This will be sent the last since the initial
            // event listener is attached the first.
            client.send('hello from mock')
            client.close()
          }
        })
      }),
    )
    await worker.start()

    worker.use(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // This will be sent first since the override listener
            // is attached the last.
            client.send('override data')
          }
        })
      }),
    )
  })

  const clientMessages = await page.evaluate(() => {
    const messages: Array<string> = []
    const socket = new WebSocket('wss://example.com')

    return new Promise<Array<string>>((resolve, reject) => {
      socket.onopen = () => socket.send('hello')
      socket.onmessage = (event) => messages.push(event.data)
      socket.onclose = () => resolve(messages)
      socket.onerror = reject
    })
  })

  expect(clientMessages).toEqual(['override data', 'hello from mock'])
})

test('combines initial and override listeners in the opposite order', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('hello from mock')
          }
        })
      }),
    )
    await worker.start()

    worker.use(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Queue this send to the next tick so it
            // happens after the initial listener's send.
            queueMicrotask(() => {
              client.send('override data')
              client.close()
            })
          }
        })
      }),
    )
  })

  const clientMessages = await page.evaluate(() => {
    const messages: Array<string> = []
    const socket = new WebSocket('wss://example.com')

    return new Promise<Array<string>>((resolve, reject) => {
      socket.onopen = () => socket.send('hello')
      socket.onmessage = (event) => messages.push(event.data)
      socket.onclose = () => resolve(messages)
      socket.onerror = reject
    })
  })

  expect(clientMessages).toEqual(['hello from mock', 'override data'])
})

test('does not affect unrelated events', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('must not be sent')
          }

          if (event.data === 'fallthrough') {
            client.send('ok')
            client.close()
          }
        })
      }),
    )
    await worker.start()

    worker.use(
      service.on('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            event.stopImmediatePropagation()
            client.send('howdy, client!')
          }
        })
      }),
    )
  })

  const clientMessages = await page.evaluate(() => {
    const messages: Array<string> = []
    const socket = new WebSocket('wss://example.com')

    return new Promise<Array<string>>((resolve, reject) => {
      socket.onopen = () => socket.send('hello')
      socket.onmessage = (event) => {
        messages.push(event.data)
        if (event.data === 'howdy, client!') {
          socket.send('fallthrough')
        }
      }
      socket.onclose = () => resolve(messages)
      socket.onerror = reject
    })
  })

  expect(clientMessages).toEqual(['howdy, client!', 'ok'])
})
