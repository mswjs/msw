import * as path from 'path'
import { ChildProcess, spawn } from 'child_process'
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

let appProcess: ChildProcess | null
let APP_URL: string

const server = setupServer(
  rest.get('*/nested', (req, res, ctx) => {
    return res(ctx.json({ name: 'John' }))
  }),
)

beforeAll(async () => {
  appProcess = spawn('node', [path.resolve(__dirname, 'child.js')], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  })

  server.listen({
    process: appProcess,
  })

  await new Promise<void>((resolve) => {
    appProcess.on('message', (message) => {
      if (typeof message !== 'string') {
        return
      }

      const [, host, port] = message.match(/^address:(.+?):(.+?)$/) || []

      if (!(host || port)) {
        return
      }

      APP_URL = `http://${host}:${port}`
      resolve()
    })
  })
})

afterAll(() => {
  server.close()
  appProcess?.kill()
})

it('intercepts a request performed in a child process', async () => {
  const res = await fetch(`${APP_URL}/user`)
  const json = await res.json()

  expect(json).toEqual({ name: 'John' })
})
