import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('sends data with LF newline', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'line1\nline2' })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message).toBe('line1\nline2')
})

test('sends data with double LF (blank line in middle)', async ({
  network,
  page,
}) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'before\n\nafter' })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message).toBe('before\n\nafter')
})

test('sends data with CR newline', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'line1\rline2' })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message, 'Normalizes CR to LF (via EventSource parser)').toBe(
    'line1\nline2',
  )
})

test('sends data with CRLF newline', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'line1\r\nline2' })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message, 'Normalizes CRLF to LF (via EventSource parser)').toBe(
    'line1\nline2',
  )
})

test('sends data with mixed line endings', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          // Mix of LF, CR, and CRLF
          data: 'a\nb\rc\r\nd',
        })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message, 'Normalizes line endings to LF').toBe('a\nb\nc\nd')
})

test('sends data with multiple consecutive newlines', async ({
  network,
  page,
}) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'a\n\n\nb',
        })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message).toBe('a\n\n\nb')
})

test('sends an empty string data', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: '' })
      }),
    )
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject(new Error('EventSource error'))

      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  })

  expect(message).toBe('')
})
