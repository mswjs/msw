import {
  deleteRequestPassthroughHeader,
  shouldBypassRequest,
} from './request-utils'

describe(shouldBypassRequest, () => {
  test('returns true for a request with bypass header', () => {
    expect(
      shouldBypassRequest(
        new Request('http://example.com', {
          headers: {
            accept: 'msw/passthrough',
          },
        }),
      ),
    ).toBe(true)
  })

  test('returns false for a regular request', () => {
    expect(shouldBypassRequest(new Request('http://example.com'))).toBe(false)
  })
})

describe(deleteRequestPassthroughHeader, () => {
  test('removes the bypass header from the request', () => {
    const request = new Request('http://example.com', {
      headers: {
        accept: 'msw/passthrough',
      },
    })
    deleteRequestPassthroughHeader(request)
    expect(request.headers.get('accept')).toBeNull()
  })

  test('does not remove other headers', () => {
    const request = new Request('http://example.com', {
      headers: {
        accept: 'msw/passthrough',
        'content-type': 'application/json',
      },
    })
    deleteRequestPassthroughHeader(request)
    expect(request.headers.get('content-type')).toBe('application/json')
  })
})
