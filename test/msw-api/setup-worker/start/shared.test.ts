import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'




test('shares the client registration for all other clients when "shared" option is set to "true"', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'shared.mocks.ts'))
  const { messages } = captureConsole(runtime.page)
  const iframeUrl = `${runtime.origin}/test/support/template/iframe.html`

  await runtime.reload()

  await runtime.page.evaluate((url) => {
    const iframe = document.createElement('iframe')
    iframe.src = url
    document.body.appendChild(iframe)

    return iframe
  }, iframeUrl)

  await runtime.page.waitForSelector('iframe')
  const element = await runtime.page.$(`iframe[src="${iframeUrl}"]`)
  const frame = await element.contentFrame()

  const response = await frame.evaluate(() => {
    return fetch(`${window.location.origin}/user`).then((response) =>
      response.json(),
    )
  })

  expect(response).toEqual({
    firstName: 'John',
    age: 32,
  })

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Shared Mocking enabled.')
  })
  expect(activationMessage).toBeTruthy()

  const requestsLog = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW]') && text.includes('GET /user')
  })

  expect(requestsLog).toMatch(/\[MSW\] \d{2}:\d{2}:\d{2} GET \/user 200/)
  
  return runtime.cleanup()
})
