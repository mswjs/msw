import * as path from 'path'
import { pageWith } from 'page-with'

it('supports the import of the UMD bundle in a browser', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'umd.mocks.ts'),
  })

  expect(runtime.consoleSpy.get('error')).toBeUndefined()

  const response = await runtime.request('/user')

  expect(response.status()).toEqual(200)
  expect(response.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await response.json()).toEqual({
    firstName: 'John',
  })
})
