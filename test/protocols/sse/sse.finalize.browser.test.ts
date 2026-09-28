import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

declare global {
  interface Window {
    notifyFinalized(id?: string | null): void
    sourceOne: EventSource
    sourceTwo: EventSource
  }
}

test('runs cleanup after the event source is closed by the client', async ({
  network,
  page,
}) => {
  const finalizedAt = Promise.withResolvers<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ finalize }) => {
        finalize(() => window.notifyFinalized())
      }),
    )
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        source.close()
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt.promise).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs cleanup after the event source is closed by the handler', async ({
  network,
  page,
}) => {
  const finalizedAt = Promise.withResolvers<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client, finalize }) => {
        setTimeout(() => client.close(), 250)
        finalize(() => window.notifyFinalized())
      }),
    )
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt.promise).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs cleanup after the event source is errored by the handler', async ({
  network,
  page,
}) => {
  const finalizedAt = Promise.withResolvers<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client, finalize }) => {
        setTimeout(() => client.error(), 250)
        finalize(() => window.notifyFinalized())
      }),
    )
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt.promise).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs independent cleanups for parallel event sources', async ({
  network,
  page,
}) => {
  const finalizedIds: Array<string> = []
  await page.exposeFunction('notifyFinalized', (id: string) => {
    finalizedIds.push(id)
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ request, finalize }) => {
        const url = new URL(request.url)
        finalize(() => window.notifyFinalized(url.searchParams.get('id')))
      }),
    )
  })

  await page.evaluate(() => {
    const sourceOne = new EventSource('http://localhost/stream?id=one')
    const sourceTwo = new EventSource('http://localhost/stream?id=two')
    Object.assign(window, { sourceOne, sourceTwo })

    return Promise.all([
      new Promise((resolve) => {
        sourceOne.addEventListener('open', resolve)
      }),
      new Promise((resolve) => {
        sourceTwo.addEventListener('open', resolve)
      }),
    ])
  })

  // Closing one event source must only run the cleanups
  // scheduled for that connection.
  await page.evaluate(() => {
    window.sourceOne.close()
  })

  await expect.poll(() => finalizedIds).toEqual(['one'])

  await page.evaluate(() => {
    window.sourceTwo.close()
  })

  await expect.poll(() => finalizedIds).toEqual(['one', 'two'])
})

test('runs cleanup when the handler closes the event source synchronously', async ({
  network,
  page,
}) => {
  const finalized = Promise.withResolvers<void>()
  await page.exposeFunction('notifyFinalized', () => {
    finalized.resolve()
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client, finalize }) => {
        finalize(() => window.notifyFinalized())
        client.close()
      }),
    )
  })

  await page.evaluate(() => {
    new EventSource('http://localhost/stream')
  })

  await expect(finalized.promise).resolves.toBeUndefined()
})
