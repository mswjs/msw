/**
 * @vitest-environment node
 */
import { graphql, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Create a large number of request handlers.
const restHandlers = new Array(100).fill(null).map((_, index) => {
  return http.post(
    `https://example.com/resource/${index}`,
    async ({ request }) => {
      const text = await request.text()
      return HttpResponse.text(text + index.toString())
    },
  )
})

const graphqlHanlers = new Array(100).fill(null).map((_, index) => {
  return graphql.query(`Get${index}`, () => {
    return HttpResponse.json({ data: { index } })
  })
})

const server = setupServer(...restHandlers, ...graphqlHanlers)

beforeAll(() => {
  server.listen()
  jest.spyOn(process.stderr, 'write')
})

afterAll(() => {
  server.close()
  jest.restoreAllMocks()
})

it('does not print a memory leak warning when having many request handlers', async () => {
  const httpResponse = await fetch('https://example.com/resource/42', {
    method: 'POST',
    body: 'request-body-',
  }).then((response) => response.text())

  const graphqlResponse = await fetch('https://example.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query Get42 { index }`,
    }),
  }).then((response) => response.json())

  // Must not print any memory leak warnings.
  expect(process.stderr.write).not.toHaveBeenCalled()

  // Must return the mocked response.
  expect(httpResponse).toBe('request-body-42')
  expect(graphqlResponse).toEqual({ data: { index: 42 } })
})
