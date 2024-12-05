/**
 * @vitest-environment node
 */
import { http } from './http'
import { getResponse } from './getResponse'

it('returns undefined given empty headers array', async () => {
  expect(
    await getResponse([], new Request('http://localhost/')),
  ).toBeUndefined()
})

it('returns undefined given no matching handlers', async () => {
  expect(
    await getResponse(
      [http.get('/product', () => void 0)],
      new Request('http://localhost/user'),
    ),
  ).toBeUndefined()
})

it('returns undefined given a matching handler that returned no response', async () => {
  expect(
    await getResponse(
      [http.get('*/user', () => void 0)],
      new Request('http://localhost/user'),
    ),
  ).toBeUndefined()
})

it('returns undefined given a matching handler that returned explicit undefined', async () => {
  expect(
    await getResponse(
      [http.get('*/user', () => undefined)],
      new Request('http://localhost/user'),
    ),
  ).toBeUndefined()
})

it('returns the response returned from a matching handler', async () => {
  const response = await getResponse(
    [http.get('*/user', () => Response.json({ name: 'John' }))],
    new Request('http://localhost/user'),
  )

  expect(response?.status).toBe(200)
  expect(response?.headers.get('Content-Type')).toBe('application/json')
  expect(await response?.json()).toEqual({ name: 'John' })
})

it('returns the response from the first matching handler if multiple match', async () => {
  const response = await getResponse(
    [
      http.get('*/user', () => Response.json({ name: 'John' })),
      http.get('*/user', () => Response.json({ name: 'Kate' })),
    ],
    new Request('http://localhost/user'),
  )

  expect(response?.status).toBe(200)
  expect(response?.headers.get('Content-Type')).toBe('application/json')
  expect(await response?.json()).toEqual({ name: 'John' })
})
