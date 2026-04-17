import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    worker: import('msw/browser').SetupWorker
    http: typeof import('msw').http
    HttpResponse: typeof import('msw').HttpResponse
  }
}

/**

Request shapes (the x-axis)

1. page.goto(url) — address-bar-style navigation (GET, mode: "navigate")
2. <a href> click — same shape, different initiator
3. <form method="GET"> submit via requestSubmit() — query string encoding
4. <form method="POST"> with application/x-www-form-urlencoded body
5. <form method="POST" enctype="multipart/form-data"> with a file field
6. Nested navigation — <iframe> src or form inside iframe (mode: "nested-navigate" in spec)
 */

test('mocks a destination of a link navigation', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./navigate.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.msw

    worker.use(
      http.get('*/destination', () => {
        return HttpResponse.html(`<p>Hello world</p>`)
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
  await expect(page.getByText('Hello world')).toBeVisible()
})

test.fixme('bypasses an unhandled form submission request', () => {})

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
        return HttpResponse.html(`<p>Thank you, ${data.get('username')}!</p>`)
      }),
    )
  })

  await page.getByLabel('Username').fill('octocat')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(new URL('/action', page.url()).href)
  await expect(page.getByText('Thank you, octocat!')).toBeVisible()
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
  await expect(page.getByRole('heading')).toHaveText('Unauthorized')
})
