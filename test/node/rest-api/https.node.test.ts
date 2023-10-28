/**
 * @vitest-environment node
 */
import https from 'https'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('intercepts and mocks a request made via "https"', (done) => {
  server.use(
    http.get('https://api.example.com/resource', () => {
      return HttpResponse.text('Hello, world!')
    }),
  )
  const request = https.get('https://api.example.com/resource')

  request.on('response', (response) => {
    const chunks: Array<Buffer> = []
    response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))

    response.on('error', done)
    response.once('end', () => {
      expect(chunks).toHaveLength(1)

      const responseText = Buffer.concat(chunks).toString('utf8')
      expect(responseText).toBe('Hello, world!')

      done()
    })
  })

  request.on('error', done)
})
