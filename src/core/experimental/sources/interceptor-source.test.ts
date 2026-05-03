// @vitest-environment node
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import type { HttpNetworkFrame } from '../frames/http-frame'
import { InterceptorSource } from './interceptor-source'

afterEach(() => {
  vi.restoreAllMocks()
})

it('removes frame event listeners after the response event is emitted', async () => {
  const source = new InterceptorSource({
    interceptors: [new FetchInterceptor()],
  })

  let capturedFrame: HttpNetworkFrame | undefined

  source.on('frame', ({ frame }) => {
    capturedFrame = frame as unknown as HttpNetworkFrame
    capturedFrame.respondWith(new Response('ok'))
  })

  source.enable()

  await fetch('http://localhost/test')

  const removeAllListenersSpy = vi.spyOn(capturedFrame!.events, 'removeAllListeners')

  await new Promise<void>((resolve) => queueMicrotask(resolve))

  expect(removeAllListenersSpy).toHaveBeenCalledOnce()

  source.disable()
})
