import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'

describe('getResponse - passthrough function', () => {
  let mockFetch
  let mockEvent
  let mockClient
  let getResponse

  beforeAll(() => {
    global.self = {
      addEventListener: vi.fn(),
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    getResponse = require('./mockServiceWorker').getResponse
  })

  afterAll(() => {
    delete global.self
  })

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response('mocked response'))

    mockEvent = {
      request: {
        clone: vi.fn().mockReturnValue({
          headers: new Headers(),
          url: 'http://example.com',
          method: 'GET',
        }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      },
    }

    mockClient = {
      id: 'client-id',
      frameType: 'top-level',
    }

    global.fetch = mockFetch
  })

  it('should call fetch with the correct modified headers', async () => {
    const headers = new Headers()
    headers.set('accept', 'application/json, msw/passthrough')

    mockEvent.request.clone.mockReturnValue({
      headers,
      url: 'http://example.com',
      method: 'GET',
    })

    await getResponse(mockEvent, mockClient, 'request-id')

    expect(mockFetch).toHaveBeenCalled()

    const headersReceived = mockFetch.mock.calls[0][1].headers
    expect(headersReceived.get('accept')).toBe('application/json')
  })

  it('should call fetch with the correct modified headers when msw/passthrough is the only value in accept', async () => {
    const headers = new Headers()
    headers.set('accept', 'msw/passthrough')

    mockEvent.request.clone.mockReturnValue({
      headers,
      url: 'http://example.com',
      method: 'GET',
    })

    await getResponse(mockEvent, mockClient, 'request-id')

    expect(mockFetch).toHaveBeenCalled()

    const headersReceived = mockFetch.mock.calls[0][1].headers
    expect(headersReceived.has('accept')).toBe(false)
  })

  it('should call fetch with the original accept header when msw/passthrough is not present', async () => {
    const headers = new Headers()
    headers.set('accept', 'application/json, text/html')

    mockEvent.request.clone.mockReturnValue({
      headers,
      url: 'http://example.com',
      method: 'GET',
    })

    await getResponse(mockEvent, mockClient, 'request-id')

    expect(mockFetch).toHaveBeenCalled()

    const headersReceived = mockFetch.mock.calls[0][1].headers
    expect(headersReceived.get('accept')).toBe('application/json, text/html')
  })
})
