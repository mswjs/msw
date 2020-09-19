import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

let runtime: TestAPI
let postMessages = []

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'notifications.mocks.ts'),
  )

  await runtime.page.exposeFunction('onPostMessage', function (evt) {
    switch (evt.type) {
      case 'REQUEST':
      case 'REQUEST_COMPLETE': {
        // Ignoring static files
        if (evt.payload.url.match(/.js$/)) return
        postMessages.push(evt)
      }
      default:
      // Ignore the rest
    }
  })

  await runtime.page.evaluateOnNewDocument(() => {
    navigator.serviceWorker.addEventListener('message', function (message) {
      const evt = JSON.parse(message.data)
      // @ts-ignore
      window.onPostMessage(evt)
    })
  })
})

beforeEach(() => {
  postMessages = []
})

afterAll(() => {
  return runtime.cleanup()
})

test('notifies when a fetch request initiates/completes with a mocked response', async () => {
  const { messages } = captureConsole(runtime.page)


  await runtime.reload()

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })

  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })

  const requetsLog = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW]') && text.includes('GET /user')
  })

  expect(requetsLog).toMatch(/\[MSW\] \d{2}:\d{2}:\d{2} GET \/user 200/)

  expect(postMessages).toHaveLength(2)
  const request = postMessages.find((i) => i.type === 'REQUEST').payload
  const response = postMessages.find((i) => i.type === 'REQUEST_COMPLETE')
    .payload
  const expectedRequest = {
    url: `${runtime.origin}/user`,
    method: 'GET',
    headers: {
      accept: '*/*',
      'sec-ch-ua': '',
      'sec-ch-ua-mobile': '?0',
    },
    cache: 'default',
    mode: 'cors',
    credentials: 'same-origin',
    destination: 'empty',
    integrity: '',
    redirect: 'follow',
    referrer: `${runtime.origin}/`,
    referrerPolicy: 'no-referrer-when-downgrade',
    body: '',
    bodyUsed: false,
    keepalive: false,
  }
  expect(request.id.toString()).toMatch(/^\d{3,}$/)
  expect(request).toMatchObject(expectedRequest)
  expect(response.request).toMatchObject(expectedRequest)
  expect(response.response).toMatchObject({
    status: 200,
    statusText: 'OK',
    body: '{"firstName":"John","age":32}',
    delay: 0,
    once: false,
    headers: [
      ['x-powered-by', 'msw'],
      ['content-type', 'application/json'],
    ],
  })
})

test('notifies when a fetch request initiates/completes with no mocked response', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  await runtime.reload()

  const res = await runtime.request({
    url: `${runtime.origin}/article`,
  })

  const headers = res.headers()
  const body = await res.text()
  const expectBody =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Error</title></head><body><pre>Cannot GET /article</pre></body></html>'

  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body.replace(/\n/gi, '')).toEqual(expectBody)

  const requetsLog = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW]') && text.includes('GET /article')
  })

  expect(requetsLog).toBeUndefined()

  expect(postMessages).toHaveLength(2)
  const request = postMessages.find((i) => i.type === 'REQUEST').payload
  const response = postMessages.find((i) => i.type === 'REQUEST_COMPLETE')
    .payload
  expect(request.id.toString()).toMatch(/^\d{3,}$/)
  expect(request).toMatchObject({
    url: `${runtime.origin}/article`,
    method: 'GET',
    headers: {
      accept: '*/*',
      'sec-ch-ua': '',
      'sec-ch-ua-mobile': '?0',
    },
    cache: 'default',
    mode: 'cors',
    credentials: 'same-origin',
    destination: 'empty',
    integrity: '',
    redirect: 'follow',
    referrer: `${runtime.origin}/`,
    referrerPolicy: 'no-referrer-when-downgrade',
    body: '',
    bodyUsed: false,
    keepalive: false,
  })
  expect(body.replace(/\n/gi, '')).toEqual(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Error</title></head><body><pre>Cannot GET /article</pre></body></html>',
  )
  expect(response.response).toMatchObject({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    url: `${runtime.origin}/article`,
    headers: {
      connection: 'keep-alive',
      'content-length': '146',
      'content-security-policy': "default-src 'none'",
      'content-type': 'text/html; charset=utf-8',
      'service-worker-allowed': '/',
      'x-content-type-options': 'nosniff',
      'x-powered-by': 'Express',
    },
    bodyUsed: true,
  })
  expect(response)
  expect(response.response.body.replace(/\n/gi, '')).toEqual(expectBody)
})
