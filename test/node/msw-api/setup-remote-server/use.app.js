const express = require('express')
const { rest, HttpResponse } = require('msw')
const { setupServer } = require('msw/node')

// Enable API mocking as usual.
const server = setupServer(
  rest.get('https://example.com/resource', () => {
    return HttpResponse.json([1, 2, 3])
  }),
)

server.listen()

// Spawn a Node.js application.
const app = express()

app.get('/resource', async (req, res) => {
  const data = await fetch('https://example.com/resource').then((response) =>
    response.json(),
  )

  res.set(200).json(data)
})

const httpServer = app.listen(() => {
  if (!process.send) {
    throw new Error(
      'Failed to start a test Node.js app: not spawned as a child process of the test',
    )
  }

  const address = httpServer.address()

  if (typeof address === 'string') {
    return process.send(address)
  }

  process.send(new URL(`http://localhost:${address.port}`).href)
})
