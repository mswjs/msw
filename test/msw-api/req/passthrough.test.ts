import { HttpResponse, http, passthrough } from 'msw'
import { expect, test } from '../../setup/vitest-helpers'

interface ResponseBody {
  name: string
}

test('performs request as-is when returning "req.passthrough" call in the resolver', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const endpointUrl = testServer.http.url('/passthrough/user')

  network.use(
    http.post<never, ResponseBody>(endpointUrl.href, () => {
      return passthrough()
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })
  expect(consoleSpy.get('warning')).toBeUndefined()
})

test('does not allow fall-through when returning "req.passthrough" call in the resolver', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const endpointUrl = testServer.http.url('/passthrough/user')

  network.use(
    http.post<never, ResponseBody>(endpointUrl.href, () => {
      return passthrough()
    }),
    http.post<never, ResponseBody>(endpointUrl.href, () => {
      return HttpResponse.json({ name: 'Kate' })
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })
  expect(consoleSpy.get('warning')).toBeUndefined()
})

test('performs a request as-is if nothing was returned from the resolver', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough/user')

  network.use(
    http.post<never, ResponseBody>(endpointUrl.href, () => {
      return
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })
})

for (const code of [204, 205, 304]) {
  test(`performs a ${code} request as-is if passthrough was returned from the resolver`, async ({
    network,
    fetch,
    page,
    testServer,
  }) => {
    const endpointUrl = testServer.http.url(`/passthrough/status-${code}/user`)

    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    network.use(
      http.post<never, ResponseBody>(endpointUrl.href, () => {
        return passthrough()
      }),
    )

    const res = await fetch(endpointUrl, { method: 'POST' })
    expect(res.status()).toBe(code)
    expect(errors).toEqual([])
  })

  test(`performs a ${code} request as-is if nothing was returned from the resolver`, async ({
    network,
    fetch,
    page,
    testServer,
  }) => {
    const endpointUrl = testServer.http.url(`/passthrough/status-${code}/user`)

    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    network.use(
      http.post<never, ResponseBody>(endpointUrl.href, () => {
        return
      }),
    )

    const res = await fetch(endpointUrl, { method: 'POST' })
    expect(res.status()).toBe(code)
    expect(errors).toEqual([])
  })
}
