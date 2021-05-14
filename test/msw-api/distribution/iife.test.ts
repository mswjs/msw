import * as path from 'path'
import { pageWith } from 'page-with'

it('supports the usage of the IIFE bundle in a <script> tag', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'iife.mocks.js'),
    markup: `
<script src="/iife/index.js"></script>
    `,
    contentBase: path.resolve(process.cwd(), 'lib'),
  })

  expect(runtime.consoleSpy.get('error')).toBeUndefined()

  const response = await runtime.request('/user')

  expect(response.status()).toEqual(200)
  expect(response.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await response.json()).toEqual({
    firstName: 'John',
  })
})
