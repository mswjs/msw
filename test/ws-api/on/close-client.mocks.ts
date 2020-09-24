import { ws } from 'msw'

const server = ws.link('wss://api.mswjs.io')

server.on('connection', (ws) => {
  ws.on('close', (code, reason) => {
    console.log(
      `[server] client (${ws.url}) closed: code ${code}, reason ${reason}`,
    )
  })
})

const client = new WebSocket('wss://api.mswjs.io')

client.addEventListener('close', () => {
  console.log('[client] closed')
})

document.body.addEventListener('click', () => {
  client.close()
})
