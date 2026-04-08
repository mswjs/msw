/**
 * @vitest-environment node
 */
import express from 'express'
import zlib from 'zlib'
import { setupServer } from 'msw/node'
import got from 'got'
import { afterAll, beforeAll, expect, it } from 'vitest'

const app = express()

const generateNFieldObject = (n: number) => {
  const nFieldObject: Record<string, string> = {}
  for (let i = 1; i <= n; i++) {
    nFieldObject[`field${i}`] = `value${i}`
  }
  return nFieldObject
}

app.get('/test/:number', (req, res) => {
  const body = generateNFieldObject(Number(req.params.number))
  const json = JSON.stringify(body)

  zlib.gzip(json, (err, result) => {
    if (err) {
      res.status(500).end()
      return
    }
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Length', String(result.length))
    res.end(result)
  })
})

let listener: ReturnType<typeof app.listen>

beforeAll(() => {
  listener = app.listen(1234)
})

afterAll(() => {
  listener.close()
})

const sendRequests = async (label: number) => {
  await Promise.all([
    fetch('http://localhost:1234/test/60', { method: 'GET' }),
    got.get('http://localhost:1234/test/60'),
  ])
}

it('regression #2200: works before and after starting MSW server', async () => {
  // First: no MSW interceptors active
  await sendRequests(1)

  // Start MSW server (no handlers configured)
  const mswServer = setupServer()
  mswServer.listen()

  try {
    // Requests should still work when MSW is running but not intercepting
    await sendRequests(2)
  } finally {
    mswServer.close()
  }

  expect(true).toBe(true)
})
