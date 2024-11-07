import { test, expect } from '../../../../../playwright.extend'

test('intercepts a request issued by child frame when both child and parent have MSW', async ({
  webpackServer,
  page,
}) => {
  const parentCompilation = await webpackServer.compile([
    require.resolve('./parent.mocks.ts'),
  ])
  const childCompilation = await webpackServer.compile([
    require.resolve('./child.mocks.ts'),
  ])

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
