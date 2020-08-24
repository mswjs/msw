import { ws } from 'msw'

const server = ws.link('wss://api.mswjs.io')

server.on('connection', (ws) => {
  console.log(`[server] client connection: ${ws.url}`)
})

const socket = new WebSocket('wss://api.mswjs.io')

socket.addEventListener('open', () => {
  console.log('[client] opened')
})
