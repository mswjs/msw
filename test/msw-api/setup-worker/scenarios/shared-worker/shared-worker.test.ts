import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../../../support/waitFor'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'shared-worker.mocks.ts'),
    contentBase: path.resolve(__dirname),
  })
}

test('does not interfere with a shared worker', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    const worker = new SharedWorker('/worker.js')

    worker.addEventListener('error', () =>
      console.error('There is an error with worker'),
    )

    worker.port.onmessage = (event) => {
      console.log(event.data)
    }

    worker.port.postMessage('john')
  })

  await waitFor(() => {
    expect(consoleSpy.get('error')).toBeUndefined()
    expect(consoleSpy.get('log')).toContain('hello, john')
  })
})
