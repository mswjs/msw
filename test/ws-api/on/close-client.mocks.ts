import { ws } from 'msw'

const server = ws.link('wss://example.com')

server.on('connection', (ws) => {
  ws.on('close', (code, reason) => {
    console.log(
      `[server] client (${ws.url}) closed: code ${code}, reason ${reason}`,
    )
  })
})

const client = new WebSocket('wss://example.com')

client.addEventListener('close', () => {
  console.log('[client] closed')
})

document.body.addEventListener('click', () => {
  client.close()
})
