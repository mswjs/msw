import { parentPort } from 'node:worker_threads'
import { setupRemoteServer } from 'msw/node'

const server = setupRemoteServer()
await server.listen()

await fetch('https://api.acme.com/user').then(async (response) => {
  parentPort.postMessage(response.status)
})
