import { sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('sends data with LF newline', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'line1\nline2',
        })
      }),
    )
    await worker.start()
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
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'before\n\nafter',
        })
      }),
    )
    await worker.start()
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

test('sends data with CR newline', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'line1\rline2',
        })
      }),
    )
    await worker.start()
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

  // CR is normalized to LF by the EventSource parser
  expect(message).toBe('line1\nline2')
})

test('sends data with CRLF newline', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'line1\r\nline2',
        })
      }),
    )
    await worker.start()
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

  // CRLF is normalized to LF by the EventSource parser
  expect(message).toBe('line1\nline2')
})

test('sends data with mixed line endings', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          // Mix of LF, CR, and CRLF
          data: 'a\nb\rc\r\nd',
        })
      }),
    )
    await worker.start()
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

  // All line endings normalized to LF
  expect(message).toBe('a\nb\nc\nd')
})

test('sends data with multiple consecutive newlines', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'a\n\n\nb',
        })
      }),
    )
    await worker.start()
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

test('sends empty string data', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: '',
        })
      }),
    )
    await worker.start()
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
