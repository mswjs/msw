import { createTestHttpServer } from '@epic-web/test-server/http'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    worker: import('msw/browser').SetupWorker
    http: typeof import('msw').http
    HttpResponse: typeof import('msw').HttpResponse
    passthrough: typeof import('msw').passthrough
    bypass: typeof import('msw').bypass
  }
}

test('exposes a navigation request in the resolver', async ({
  loadExample,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
  )

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('*/destination', async ({ request }) => {
        return HttpResponse.json({
          url: request.url,
          method: request.method,
          mode: request.mode,
          body: await request.text(),
        })
      }),
    )
  })

  const destinationUrl = new URL('./destination', compilation.previewUrl).href

  await page.evaluate((url) => {
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.textContent = 'Go to page'
    document.body.append(link)
  }, destinationUrl)

  await page.getByRole('link', { name: 'Go to page' }).click()

  await expect(page).toHaveURL(destinationUrl)

  const requestJson = await page
    .evaluate(() => document.body.textContent)
    .then((value) => JSON.parse(value))

  expect(requestJson).toEqual({
    url: destinationUrl,
    method: 'GET',
    mode: 'navigate',
    body: '',
  })
})

test('exposes a form submission request in the resolver', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post('/action', async ({ request }) => {
        const body = await request.formData()
        const json = Array.from(body.entries())

        return HttpResponse.json({
          url: request.url,
          method: request.method,
          mode: request.mode,
          body: json,
        })
      }),
    )
  })

  const actionUrl = new URL('/action', page.url()).href

  await page.getByLabel('Username').fill('octocat')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(actionUrl)

  const requestJson = await page
    .evaluate(() => document.body.textContent)
    .then((value) => JSON.parse(value))

  expect(requestJson).toEqual({
    url: actionUrl,
    method: 'POST',
    mode: 'navigate',
    body: [['username', 'octocat']],
  })
})

test('mocks a programmatic navigation in playwright', async ({
  loadExample,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
  )

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('*/destination', () => {
        return HttpResponse.html(`<p>Hello world</p>`)
      }),
    )
  })

  const destinationUrl = new URL('./destination', compilation.previewUrl).href
  await page.goto(destinationUrl)

  await expect(page).toHaveURL(destinationUrl)
  await expect(page.getByText('Hello world')).toBeVisible()
})

test('mocks a destination of a link navigation', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('*/destination', () => {
        return HttpResponse.html(`<h1>Hello world</h1>`)
      }),
    )
  })

  await page.evaluate(() => {
    const link = document.createElement('a')
    link.setAttribute('href', './destination')
    link.textContent = 'Go to page'
    document.body.append(link)
  })

  await page.getByRole('link', { name: 'Go to page' }).click()

  await expect(page).toHaveURL(/\/destination$/)
  await expect(page.getByRole('heading')).toHaveText('Hello world')
})

test('bypasses an unhandled form submission request', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/action', () => {
        return new Response('<p>Original response</p>', {
          headers: { 'content-type': 'text/html' },
        })
      })
    },
  })

  const actionUrl = server.http.url('/action').href
  await page.evaluate((actionUrl) => {
    document.querySelector('form')!.setAttribute('action', actionUrl)
  }, actionUrl)

  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(actionUrl)
  await expect(page.getByText('Original response')).toBeVisible()
})

test('supports form submission passthrough', async ({ loadExample, page }) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.post('/action', (req, res) => {
            res.end(`<h1>Original response</h1>`)
          })
        })
      },
    },
  )

  const actionUrl = new URL('./action', compilation.previewUrl).href
  await page.evaluate((actionUrl) => {
    const { worker, http, passthrough } = window.msw

    worker.use(
      http.post(actionUrl, () => {
        return passthrough()
      }),
    )

    document.querySelector('form')!.setAttribute('action', actionUrl)
  }, actionUrl)

  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(actionUrl)
  await expect(page.getByRole('heading')).toHaveText('Original response')
})

test('supports response patching of a same-origin form submission', async ({
  loadExample,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.post('/action', (req, res) => {
            res.end('John')
          })
        })
      },
    },
  )

  const actionUrl = new URL('./action', compilation.previewUrl).href
  await page.evaluate((actionUrl) => {
    const { worker, http, bypass, HttpResponse } = window.msw

    worker.use(
      http.post(actionUrl, async ({ request }) => {
        const originalResponse = await fetch(bypass(request))
        const username = await originalResponse.text()
        return HttpResponse.html(`<h1>Hello, ${username}!</h1>`)
      }),
    )

    document.querySelector('form')!.setAttribute('action', actionUrl)
  }, actionUrl)

  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(actionUrl)
  await expect(page.getByRole('heading')).toHaveText('Hello, John!')
})

test('cannot intercept cross-origin form submissions', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/action', () => {
        return new Response('<h1>Original response</h1>', {
          headers: { 'content-type': 'text/html' },
        })
      })
    },
  })

  const actionUrl = server.http.url('/action').href
  await page.evaluate((actionUrl) => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post(actionUrl, () => {
        return HttpResponse.html(`<h1>Mocked!</h1>`)
      }),
    )

    document.querySelector('form')!.setAttribute('action', actionUrl)
  }, actionUrl)

  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(actionUrl)
  await expect(page.getByRole('heading')).toHaveText('Original response')
})

test('responds to a form submission with a mocked HTML response', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post('/action', async ({ request }) => {
        const data = await request.formData()
        return HttpResponse.html(`<h1>Hello, ${data.get('username')}!</h1>`)
      }),
    )
  })

  await page.getByLabel('Username').fill('octocat')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(new URL('/action', page.url()).href)
  await expect(page.getByRole('heading')).toHaveText('Hello, octocat!')
})

test('responds to a form submission with a mock redirect response', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post('/action', () => {
        return HttpResponse.redirect('/destination')
      }),
    )
  })

  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page).toHaveURL(new URL('/destination', page.url()).href)
})

test('responds to a form submission with a mocked 204 response', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http } = window.msw

    worker.use(
      http.post('/action', () => {
        return new Response(null, { status: 204 })
      }),
    )
  })

  await page.evaluate(() => {
    /**
     * @note A hack to reliably assert that the page hasn't reloaded.
     * A reload will delete this window property.
     */
    Object.assign(window, { __THE_SAME_PAGE__: true })
  })

  const currentUrl = page.url()
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(currentUrl)
  await expect(
    page.evaluate(() => Reflect.get(window, '__THE_SAME_PAGE__')),
  ).resolves.toBe(true)
})

test('responds to a form submission with a mocked 4xx response', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post('/action', () => {
        return HttpResponse.html('<h1>Unauthorized</h1>', { status: 401 })
      }),
    )
  })

  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(new URL('/action', page.url()).href)
  await expect(page.getByRole('heading')).toHaveText('Unauthorized')
})

test('intercepts a form submission with a "GET" method', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('/action', ({ request }) => {
        const url = new URL(request.url)
        const username = url.searchParams.get('username')
        return HttpResponse.html(`<h1>Hello, ${username}!</h1>`)
      }),
    )

    document.querySelector('form')!.setAttribute('method', 'GET')
  })

  await page.getByLabel('Username').fill('octocat')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(
    new URL('/action?username=octocat', page.url()).href,
  )
  await expect(page.getByRole('heading')).toHaveText('Hello, octocat!')
})

test('intercepts navigation in an iframe', async ({ loadExample, page }) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/frame', (req, res) => {
            res
              .set('content-type', 'text/html')
              .end(`<a href="/some-page">Goto page</a>`)
          })
        })
      },
    },
  )

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('/some-page', () => {
        return HttpResponse.html(`<h1>Welcome to some page!</h1>`)
      }),
    )
  })

  await page.evaluate((url) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('id', 'frame')
    iframe.setAttribute('name', 'frame')
    iframe.setAttribute('src', url)
    document.body.append(iframe)
  }, new URL('./frame', compilation.previewUrl).href)

  const frame = page.frameLocator('#frame')
  await frame.getByRole('link', { name: 'Goto page' }).click()

  await page
    .frame({ name: 'frame' })!
    .waitForURL(new URL('/some-page', compilation.previewUrl).href)
  await expect(frame.getByRole('heading')).toHaveText('Welcome to some page!')
})

test('intercepts form submission in an iframe', async ({
  loadExample,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./navigate.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/frame', (req, res) => {
            res.set('content-type', 'text/html').end(`
<form method="POST" action="/action">
  <input name="username" aria-label="Username" />
  <button>Submit</button>
</form>
              `)
          })
        })
      },
    },
  )

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.post('/action', async ({ request }) => {
        const data = await request.formData()
        return HttpResponse.html(`<h1>Hello, ${data.get('username')}!</h1>`)
      }),
    )
  })

  await page.evaluate((url) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('id', 'frame')
    iframe.setAttribute('name', 'frame')
    iframe.setAttribute('src', url)
    document.body.append(iframe)
  }, new URL('./frame', compilation.previewUrl).href)

  const frame = page.frameLocator('#frame')
  await frame.getByLabel('Username').fill('octocat')
  await frame.getByRole('button', { name: 'Submit' }).click()

  await page
    .frame({ name: 'frame' })!
    .waitForURL(new URL('/action', compilation.previewUrl).href)
  await expect(frame.getByRole('heading')).toHaveText('Hello, octocat!')
})
