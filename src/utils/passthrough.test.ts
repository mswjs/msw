// @vitest-environment node
import {
  passthrough,
  isPassthroughResponse,
  REQUEST_INTENTION_HEADER_NAME,
  RequestIntention,
} from './passthrough'

describe(passthrough, () => {
  test('creates a 302 response with the intention header', () => {
    const response = passthrough()

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(302)
    expect(response.statusText).toBe('Passthrough')
    expect(response.headers.get('x-msw-intention')).toBe('passthrough')
  })
})

describe(isPassthroughResponse, () => {
  test('returns true for a passthrough response', () => {
    expect(isPassthroughResponse(passthrough())).toBe(true)
    expect(
      isPassthroughResponse(
        new Response(null, {
          status: 302,
          headers: {
            [REQUEST_INTENTION_HEADER_NAME]: RequestIntention.passthrough,
          },
        }),
      ),
    ).toBe(true)
  })

  test('returns false for a regular response', () => {
    expect(isPassthroughResponse(new Response(null))).toBe(false)
    expect(isPassthroughResponse(new Response(null, { status: 302 }))).toBe(
      false,
    )
  })
})
