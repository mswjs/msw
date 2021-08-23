import { ws } from 'msw'

const server = ws.link('wss://example.com')

server.on('connection', (ws) => {
  console.log(`[server] client connection: ${ws.url}`)
})

const socket = new WebSocket('wss://example.com')

socket.addEventListener('open', () => {
  console.log('[client] opened')
})
