import { it } from '#/tests/future/globals'
import { http, HttpResponse } from 'msw'

it.concurrent.only('one', async ({ worker }) => {
  await worker.boundary(async () => {
    worker.use(http.get('/resource', () => HttpResponse.text('one')))
    await expect(fetch('/resource').then((r) => r.text())).resolves.toBe('one')
  })()
})

it.concurrent.only('two', async ({ worker }) => {
  await worker.boundary(async () => {
    worker.use(http.get('/resource', () => HttpResponse.text('two')))
    await expect(fetch('/resource').then((r) => r.text())).resolves.toBe('two')
  })()
})

it.concurrent('three', async ({ worker }) => {
  await worker.boundary(async () => {
    worker.use(http.get('/resource', () => HttpResponse.text('three')))

    await expect(fetch('/resource').then((r) => r.text())).resolves.toBe(
      'three',
    )
  })()
})
