/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill'
import { clearCookies } from '../../../test/support/utils'
import { MockedRequest } from './MockedRequest'

const url = new URL('/resource', location.href)

describe('cache', () => {
  it('sets "default" as the default request cache', () => {
    const request = new MockedRequest(url)
    expect(request.cache).toBe('default')
  })

  it('respects custom request init cache', () => {
    const request = new MockedRequest(url, { cache: 'no-cache' })
    expect(request.cache).toBe('no-cache')
  })
})

describe('credentials', () => {
  it('sets "same-origin" as the default request credentials', () => {
    const request = new MockedRequest(url)
    expect(request.credentials).toBe('same-origin')
  })

  it('respects custom request init credentials', () => {
    const request = new MockedRequest(url, { credentials: 'include' })
    expect(request.credentials).toBe('include')
  })
})

describe('destination', () => {
  it('sets empty string as the default request destination', () => {
    const request = new MockedRequest(url)
    expect(request.destination).toBe('')
  })

  it('respects custom request init destination', () => {
    const request = new MockedRequest(url, { destination: 'image' })
    expect(request.destination).toBe('image')
  })
})

describe('integrity', () => {
  it('sets empty string as the default request integrity', () => {
    const request = new MockedRequest(url)
    expect(request.integrity).toBe('')
  })

  it('respects custom request init integrity', () => {
    const request = new MockedRequest(url, { integrity: 'sha256-...' })
    expect(request.integrity).toBe('sha256-...')
  })
})

describe('keepalive', () => {
  it('sets false as the default request keepalive', () => {
    const request = new MockedRequest(url)
    expect(request.keepalive).toBe(false)
  })

  it('respects custom request init keepalive', () => {
    const request = new MockedRequest(url, { keepalive: true })
    expect(request.keepalive).toBe(true)
  })
})

describe('mode', () => {
  it('sets "cors" as the default request mode', () => {
    const request = new MockedRequest(url)
    expect(request.mode).toBe('cors')
  })

  it('respects custom request init mode', () => {
    const request = new MockedRequest(url, { mode: 'no-cors' })
    expect(request.mode).toBe('no-cors')
  })
})

describe('method', () => {
  it('sets "GET" as the default request method', () => {
    const request = new MockedRequest(url)
    expect(request.method).toBe('GET')
  })

  it('respects custom request init method', () => {
    const request = new MockedRequest(url, { method: 'POST' })
    expect(request.method).toBe('POST')
  })
})

describe('priority', () => {
  it('sets "auto" as the default request priority', () => {
    const request = new MockedRequest(url)
    expect(request.priority).toBe('auto')
  })

  it('respects custom request init priority', () => {
    const request = new MockedRequest(url, { priority: 'high' })
    expect(request.priority).toBe('high')
  })
})

describe('redirect', () => {
  it('sets "follow" as the default request redirect', () => {
    const request = new MockedRequest(url)
    expect(request.redirect).toBe('follow')
  })

  it('respects custom request init redirect', () => {
    const request = new MockedRequest(url, { redirect: 'error' })
    expect(request.redirect).toBe('error')
  })
})

describe('referrer', () => {
  it('sets empty string as the default request referrer', () => {
    const request = new MockedRequest(url)
    expect(request.referrer).toBe('')
  })

  it('respects custom request init referrer', () => {
    const request = new MockedRequest(url, { referrer: 'https://example.com' })
    expect(request.referrer).toBe('https://example.com')
  })
})

describe('referrerPolicy', () => {
  it('sets "no-referrer" as the default request referrerPolicy', () => {
    const request = new MockedRequest(url)
    expect(request.referrerPolicy).toBe('no-referrer')
  })

  it('respects custom request init referrerPolicy', () => {
    const request = new MockedRequest(url, { referrerPolicy: 'origin' })
    expect(request.referrerPolicy).toBe('origin')
  })
})

describe('cookies', () => {
  beforeAll(() => {
    clearCookies()
  })

  afterEach(() => {
    clearCookies()
  })

  it('preserves request cookies when there are no document cookies to infer', () => {
    const request = new MockedRequest(url, {
      headers: new Headers({ Cookie: 'token=abc-123' }),
    })

    expect(request.cookies).toEqual({ token: 'abc-123' })
    expect(request.headers.get('cookie')).toBe('token=abc-123')
  })

  it('infers document cookies for request with "same-origin" credentials', () => {
    document.cookie = 'documentCookie=yes'

    const request = new MockedRequest(url, {
      headers: new Headers({ Cookie: 'token=abc-123' }),
      credentials: 'same-origin',
    })

    expect(request.headers.get('cookie')).toEqual(
      'token=abc-123, documentCookie=yes',
    )
    expect(request.cookies).toEqual({
      // Cookies present in the document must be forwarded.
      documentCookie: 'yes',
      token: 'abc-123',
    })
  })

  it('does not infer document cookies for request with "same-origin" credentials made to extraneous origin', () => {
    document.cookie = 'documentCookie=yes'

    const request = new MockedRequest(new URL('https://example.com'), {
      headers: new Headers({ Cookie: 'token=abc-123' }),
      credentials: 'same-origin',
    })

    expect(request.headers.get('cookie')).toBe('token=abc-123')
    expect(request.cookies).toEqual({ token: 'abc-123' })
  })

  it('infers document cookies for request with "include" credentials', () => {
    document.cookie = 'documentCookie=yes'

    const request = new MockedRequest(url, {
      headers: new Headers({ Cookie: 'token=abc-123' }),
      credentials: 'include',
    })

    expect(request.headers.get('cookie')).toBe(
      'token=abc-123, documentCookie=yes',
    )
    expect(request.cookies).toEqual({
      // Cookies present in the document must be forwarded.
      documentCookie: 'yes',
      token: 'abc-123',
    })
  })

  it('infers document cookies for request with "include" credentials made to extraneous origin', () => {
    document.cookie = 'documentCookie=yes'

    const request = new MockedRequest(new URL('https://example.com'), {
      headers: new Headers({ Cookie: 'token=abc-123' }),
      credentials: 'include',
    })

    expect(request.headers.get('cookie')).toBe(
      'token=abc-123, documentCookie=yes',
    )
    expect(request.cookies).toEqual({
      // Document cookies are always included.
      documentCookie: 'yes',
      token: 'abc-123',
    })
  })

  it('does not infer document cookies for request with "omit" credentials', () => {
    document.cookie = 'documentCookie=yes'

    const request = new MockedRequest(url, {
      headers: new Headers({ Cookie: 'token=abc-123' }),
      credentials: 'omit',
    })

    expect(request.headers.get('cookie')).toBe('token=abc-123')
    expect(request.cookies).toEqual({ token: 'abc-123' })
  })
})
