/**
 * @jest-environment node
 */
import * as path from 'path'
import { ScenarioApi, pageWith } from 'page-with'
import { Response } from 'playwright'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'all.mocks.ts'),
  })
}

function requestAllMethods(
  runtime: ScenarioApi,
  url: string,
): Promise<Response[]> {
  return Promise.all(
    ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map((method) =>
      runtime.request(url, { method }),
    ),
  )
}

test('respects custom path when matching requests', async () => {
  const runtime = await createRuntime()

  // Root request.
  const rootResponses = await requestAllMethods(
    runtime,
    'http://localhost/api/',
  )

  for (const response of rootResponses) {
    expect(response.status()).toBe(200)
    expect(await response.text()).toEqual('hello world')
  }

  // Nested request.
  const nestedResponses = await requestAllMethods(
    runtime,
    'http://localhost/api/user',
  )
  for (const response of nestedResponses) {
    expect(response.status()).toBe(200)
    expect(await response.text()).toEqual('hello world')
  }

  // Mismatched request.
  // There's a fallback "rest.all()" in this test that acts
  // as a fallback request handler for all otherwise mismatched requests.
  const mismatchedResponses = await requestAllMethods(
    runtime,
    'http://localhost/foo',
  )
  for (const response of mismatchedResponses) {
    expect(response.status()).toBe(200)
    expect(await response.text()).toEqual('welcome to the jungle')
  }
})
