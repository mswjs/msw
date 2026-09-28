import type { SetupWorker } from 'msw/browser'
import { inlineModule, test, expect } from '../../../setup/playwright'

declare namespace window {
  export const msw: {
    worker: SetupWorker
  }
}

const errorExample = inlineModule(({ http, setupWorker }) => {
  const worker = setupWorker(http.get('/user', () => new Response()))
  Object.assign(window, { msw: { worker } })
})

test('rejects when given a non-existing worker script', async ({
  loadExample,
  page,
}) => {
  await loadExample(errorExample, { skipActivation: true })

  await expect(
    page.evaluate(() => {
      return window.msw.worker.start({
        serviceWorker: { url: 'invalidServiceWorker' },
      })
    }),
  ).rejects.toThrowError(/\[MSW\] Failed/)
})
