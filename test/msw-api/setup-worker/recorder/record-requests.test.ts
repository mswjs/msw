import * as path from 'path'
import { runBrowserWith, TestAPI } from '../../../support/runBrowserWith'

async function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'record-requests.mocks.ts'), {
    withRoutes(app) {
      app.post('/login', (_, res) => {
        return res.status(200).json({ name: 'John', surname: 'Maverick' }).end()
      })
      app.get('/users', (_, res) => {
        return res
          .status(200)
          .json([
            {
              name: 'Giovani',
              surname: 'Schmeler',
            },
            {
              name: 'Florence',
              surname: 'Yundt',
            },
            {
              name: 'Lenore',
              surname: 'Walsh',
            },
          ])
          .end()
      })
      app.post('/users', (_, res) => {
        return res.status(201).json({ message: 'user created' }).end()
      })
      app.delete('/users/:userId', (_, res) => {
        res.setHeader('x-my-header', 'MSW')

        return res.status(204).end()
      })
      app.head('/system', (_, res) => {
        res.setHeader('x-my-header', 'MSW')
        res.setHeader('x-maintenance', 'false')

        return res.status(200).end()
      })
    },
  })
}

async function workflow(runtime: TestAPI) {
  const responses = []
  responses.push(
    await runtime.request({
      url: `${runtime.origin}/system`,
      fetchOptions: {
        method: 'HEAD',
      },
    }),
  )

  responses.push(
    await runtime.request({
      url: `${runtime.origin}/login`,
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify({
          username: 'john.maverick',
          password: 'foo',
        }),
      },
    }),
  )

  responses.push(
    await runtime.request({
      url: `${runtime.origin}/users`,
    }),
  )

  responses.push(
    await runtime.request({
      url: `${runtime.origin}/users`,
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify({
          username: 'lucinda.kuhlman',
          surname: 'Kuhlman',
          name: 'lucinda',
        }),
      },
    }),
  )

  responses.push(
    await runtime.request({
      url: `${runtime.origin}/users/1`,
      fetchOptions: {
        method: 'DELETE',
      },
    }),
  )
  return responses
}

test('should recorder the workflow with all http methods', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.record()
  })

  const realResponses = await workflow(runtime)

  realResponses.forEach((response) => {
    const headers = response.headers()

    expect(headers).not.toHaveProperty('x-recorder')
  })

  const logs = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.stop()
  })

  expect(logs).toHaveLength(realResponses.length)

  await runtime.page.evaluate((logs) => {
    // @ts-ignore
    return window.__MSW__.use(...logs.map((log) => eval(log.function)))
  }, logs)

  const mockResponses = await workflow(runtime)

  const expectedResponses = [
    {
      id: 'system',
      status: 200,
    },
    {
      id: 'login',
      status: 200,
      body: { name: 'John', surname: 'Maverick' },
    },
    {
      id: 'get users',
      status: 200,
      body: [
        {
          name: 'Giovani',
          surname: 'Schmeler',
        },
        {
          name: 'Florence',
          surname: 'Yundt',
        },
        {
          name: 'Lenore',
          surname: 'Walsh',
        },
      ],
    },
    {
      id: 'create user',
      status: 201,
      body: { message: 'user created' },
    },
    {
      id: 'delete user',
      status: 204,
    },
  ]

  for (let i = 0; i < mockResponses.length; i++) {
    const headers = mockResponses[i].headers()

    expect(headers).toHaveProperty('x-powered-by', 'msw,Express')
    expect(headers).toHaveProperty('x-recorded-by', 'msw')

    const expectedResponse = expectedResponses[i]

    expect(mockResponses[i].status()).toEqual(expectedResponse.status)
    if (expectedResponse.body) {
      const body = await mockResponses[i].json()
      expect(body).toEqual(expectedResponse.body)
    } else {
      expect(headers).not.toHaveProperty('Content-Type')
    }
  }

  return runtime.cleanup()
})
