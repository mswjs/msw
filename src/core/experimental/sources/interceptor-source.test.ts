// @vitest-environment node
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import type { HttpNetworkFrame } from '../frames/http-frame'
import { InterceptorSource } from './interceptor-source'

let source: InterceptorSource

afterEach(() => {
  source?.disable()
  vi.restoreAllMocks()
})

it('removes frame event listeners after the response event is emitted', async () => {
  source = new InterceptorSource({
    interceptors: [new FetchInterceptor()],
  })

  let removeAllListenersSpy: ReturnType<typeof vi.spyOn> | undefined

  source.on('frame', ({ frame }) => {
    const httpFrame = frame as unknown as HttpNetworkFrame
    removeAllListenersSpy = vi.spyOn(httpFrame.events, 'removeAllListeners')
    httpFrame.respondWith(new Response('ok'))
  })

  source.enable()

  await fetch('http://localhost/test')

  await new Promise<void>((resolve) => queueMicrotask(resolve))

  expect(removeAllListenersSpy!).toHaveBeenCalledOnce()
})
