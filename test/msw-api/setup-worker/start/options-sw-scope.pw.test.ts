import { inlineModule, test, expect } from '../../../setup/playwright'

const optionsScopeExample = inlineModule(
  async ({ http, HttpResponse, setupWorker }) => {
    const worker = setupWorker(
      http.get('/user', () => {
        return HttpResponse.json({ firstName: 'John' })
      }),
    )

    await worker.start({
      serviceWorker: {
        options: {
          scope: '/profile',
        },
      },
    })
  },
)

test('respects a custom Service Worker scope', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(optionsScopeExample)

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([expect.stringContaining('[MSW] Mocking enabled.')]),
  )

  const response = await fetch('/user')
  expect(response.status()).toBe(404)
})
