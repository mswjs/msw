import { ws } from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

test('resolves outgoing events using initial handlers', async ({
  network,
  page,
}) => {
  await page.evaluate(async () => {
    const service = ws.link('*')

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('hello from mock')
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

  expect(clientMessage).toBe('hello from mock')
})

test('overrides an outgoing event listener', async ({ network, page }) => {
  await page.evaluate(async () => {
    const service = ws.link('*')

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('must not be sent')
          }
        })
      }),
    )

    network.use(
      service.addEventListener('connection', ({ client }) => {
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

test('combines initial and override listeners', async ({ network, page }) => {
  await page.evaluate(async () => {
    const service = ws.link('*')

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // This will be sent the last since the initial
            // event listener is attached the first.
            client.send('hello from mock')
            queueMicrotask(() => client.close())
          }
        })
      }),
    )

    network.use(
      service.addEventListener('connection', ({ client }) => {
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
  network,
  page,
}) => {
  await page.evaluate(async () => {
    const service = ws.link('*')

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('hello from mock')
          }
        })
      }),
    )

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Queue this send to the next tick so it
            // happens after the initial listener's send.
            queueMicrotask(() => {
              client.send('override data')
              queueMicrotask(() => client.close())
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

test('does not affect unrelated events', async ({ network, page }) => {
  await page.evaluate(async () => {
    const service = ws.link('*')

    network.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            client.send('must not be sent')
          }

          if (event.data === 'fallthrough') {
            client.send('ok')
            queueMicrotask(() => client.close())
          }
        })
      }),
    )

    network.use(
      service.addEventListener('connection', ({ client }) => {
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
