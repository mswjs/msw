// @vitest-environment node
import nodeHttp from 'node:http'
import { HttpResponse, http } from 'msw'
import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { waitForClientRequest } from '../../../support/utils'

const network = defineNetwork({
  sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
  handlers: [
    http.get('http://localhost', () => {
      return HttpResponse.text('hello world')
    }),
  ],
})

beforeAll(() => {
  network.enable()
})

afterAll(() => {
  network.disable()
})

test('uses only the provided interceptors', async () => {
  {
    const response = await fetch('http://localhost')

    // Must receive a mocked response per the defined interceptor + handler.
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('hello world')
  }

  {
    const request = nodeHttp.get('http://localhost')
    const requestPromise = waitForClientRequest(request)

    // Must receive a connection error since no intereceptor handles this client.
    await expect(requestPromise).rejects.toThrow('ECONNREFUSED')
  }
})
