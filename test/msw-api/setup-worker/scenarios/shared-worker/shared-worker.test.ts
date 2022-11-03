import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../../../support/waitFor'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'shared-worker.mocks.ts'),
    contentBase: path.resolve(__dirname),
  })
}

test('supports shared workers', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    const worker = new SharedWorker('/worker.js')
    worker.addEventListener('error', () =>
      console.error('There is an error with worker'),
    )
    worker.port.onmessage = (e) => {
      console.log(e.data)
    }
    worker.port.postMessage('Message posted to worker')
  })
  await waitFor(() => {
    expect(consoleSpy.get('error')).toBeUndefined()
    expect(consoleSpy.get('log')).toContain('Message received from worker')
  })
})
