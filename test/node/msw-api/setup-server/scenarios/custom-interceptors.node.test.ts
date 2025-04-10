import { HttpResponse, http } from 'msw'
import { SetupServerApi } from 'msw/node'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'

const fetchInterceptorSpy = vi.spyOn(FetchInterceptor.prototype, 'apply')
const xmlHttpInterceptorSpy = vi.spyOn(
  XMLHttpRequestInterceptor.prototype,
  'apply',
)

const handlers = [
  http.get('http://test.mswjs.io', () => HttpResponse.json({ success: true })),
]

const server = new SetupServerApi(handlers, [FetchInterceptor])

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

test('should only use FetchInterceptor and not XMLHttpRequestInterceptor', async () => {
  const response = await fetch('http://test.mswjs.io')
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data).toEqual({ success: true })

  // Only the interceptor that was manually passed should be applied
  expect(fetchInterceptorSpy).toHaveBeenCalled()
  expect(xmlHttpInterceptorSpy).not.toHaveBeenCalled()
})
