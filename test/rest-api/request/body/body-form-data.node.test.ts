import fetch from 'node-fetch'
import FormDataPolyfill from 'form-data'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('http://localhost/deprecated/json', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
  rest.post('http://localhost/deprecated/formData', (req, res, ctx) => {
    const body = req.body as FormData
    const file = body.get('file') as File

    return res(
      ctx.json({
        username: body.get('username'),
        password: body.get('password'),
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      }),
    )
  }),
  rest.post('http://localhost/formData', (req, res, ctx) => {
    const body = req.formData()
    const file = body.get('file') as File

    return res(
      ctx.json({
        username: body.get('username'),
        password: body.get('password'),
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      }),
    )
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('handles "FormData" from the "form-data" library as a request body', async () => {
  // Note that creating a `FormData` instance in Node/JSDOM differs
  // from the same instance in a real browser. Follow the instructions
  // of your `fetch` polyfill to learn more.
  const formData = new FormDataPolyfill()
  formData.append('username', 'john.maverick')
  formData.append('password', 'secret123')

  const res = await fetch('http://localhost/deprecated/json', {
    method: 'POST',
    headers: formData.getHeaders(),
    body: formData,
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    username: 'john.maverick',
    password: 'secret123',
  })
})

test.each([
  'http://localhost/formData',
  'http://localhost/deprecated/formData',
])(
  'handles "FormData" native object as a request body when sent as an XHR request to %s',
  async (url) => {
    const formData = new FormData()

    formData.append('username', 'john.maverick')
    formData.append('password', 'secret123')
    formData.append(
      'file',
      new Blob(['file content'], { type: 'text/plain' }),
      'file.txt',
    )

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open('POST', url, true)

      xhr.onerror = reject
      xhr.onload = () => {
        try {
          const jsonResponse = JSON.parse(xhr.response)

          expect(xhr.status).toBe(200)
          expect(jsonResponse).toEqual({
            username: 'john.maverick',
            password: 'secret123',
            file: {
              name: 'file.txt',
              size: 12, // Can't match file content exactly, no support for File.text() in jsdom
              type: 'text/plain',
            },
          })

          resolve(void 0)
        } catch (e) {
          reject(e)
        }
      }

      xhr.send(formData)
    })
  },
)
