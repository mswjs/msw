import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('sends a mock message event', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: { username: 'john' },
        })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject()

      source.addEventListener('message', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
    })
  })

  expect(message).toBe('message:{"username":"john"}')
})

test('sends a mock custom event', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse<{ userconnect: { username: string } }>(
        'http://localhost/stream',
        ({ client }) => {
          client.send({
            event: 'userconnect',
            data: { username: 'john' },
          })
        },
      ),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
      source.onerror = () => reject()
    })
  })

  expect(message).toEqual('userconnect:{"username":"john"}')
})

test('sends a mock message event with custom id', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse<{ userconnect: { username: string } }>(
        'http://localhost/stream',
        ({ client }) => {
          client.send({
            id: 'abc-123',
            event: 'userconnect',
            data: { username: 'john' },
          })
        },
      ),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        resolve(`${event.type}:${event.lastEventId}:${event.data}`)
      })
      source.onerror = () => reject()
    })
  })

  expect(message).toBe('userconnect:abc-123:{"username":"john"}')
})

test('errors the connected source', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream-error', ({ client }) => {
        queueMicrotask(() => client.error())
      }),
    )
  })

  const readyState = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const source = new EventSource('http://localhost/stream-error')
      source.onerror = () => resolve(source.readyState)
      source.onopen = () => console.log('OPEN?')
    })
  })

  // EventSource must be closed.
  expect(readyState).toBe(2)

  /**
   * @note That erroring the stream does not throw any errors.
   */
})
