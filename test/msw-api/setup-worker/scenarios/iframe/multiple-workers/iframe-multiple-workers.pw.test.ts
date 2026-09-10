import { inlineModule, test, expect } from '../../../../../setup/playwright'

const parentExample = inlineModule(({ setupWorker }) => {
  const worker = setupWorker()
  worker.start()
})

const childExample = inlineModule(({ http, setupWorker }) => {
  const worker = setupWorker(
    http.get('/resource', () => {
      return new Response('hello world')
    }),
  )
  worker.start()
})

test('intercepts a request issued by child frame when both child and parent have MSW', async ({
  viteServer,
  page,
}) => {
  const parentCompilation = await viteServer.compile(parentExample)
  const childCompilation = await viteServer.compile(childExample)

  await page.goto(parentCompilation.previewUrl, { waitUntil: 'networkidle' })

  await page.evaluate((childFrameUrl) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('id', 'child-frame')
    iframe.setAttribute('src', childFrameUrl)
    document.body.appendChild(iframe)
  }, childCompilation.previewUrl)

  const childFrameElement = await page.locator('#child-frame').elementHandle()
  const childFrame = await childFrameElement!.contentFrame()
  await childFrame!.waitForLoadState('networkidle')

  const responseText = await childFrame!.evaluate(async () => {
    const response = await fetch('/resource')
    return response.text()
  })

  expect(responseText).toBe('hello world')
})
