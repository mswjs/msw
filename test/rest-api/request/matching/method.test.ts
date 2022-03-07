import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'method.mocks.ts'),
    routes(app) {
      app.get('/user', (req, res) => {
        res.json({ uses: 'original' })
      })

      app.post('/user', (req, res) => {
        res.status(500).json({ mocked: false })
      })
    },
  })
}

test('sends a mocked response to a POST request on the matching URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user', {
    method: 'POST',
  })
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

test('does not send a mocked response to a GET request on the matching URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).not.toHaveProperty('mocked', true)
})
