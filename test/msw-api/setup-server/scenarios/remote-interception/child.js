const fetch = require('node-fetch')
const { createServer } = require('@open-draft/test-server')
const { setupRemoteServer } = require('../../../../../node')

let httpServer
const server = setupRemoteServer()
server.listen()

async function run() {
  httpServer = await createServer((app) => {
    app.get('/user', async (req, res) => {
      const json = await fetch(httpServer.http.makeUrl('/nested')).then((res) =>
        res.json(),
      )

      res.status(200).json({ name: json.name })
    })

    app.get('/nested', (req, res) => {
      res.status(200).json({ name: 'Katelyn ' })
    })
  })

  const { host, port } = httpServer.http.getAddress()
  process.send(`address:${host}:${port}`)
}

run()

process.on('disconnect', async () => {
  server.close()

  if (httpServer) {
    await httpServer.close()
  }
})
