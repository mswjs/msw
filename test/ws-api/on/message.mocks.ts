import { ws } from 'msw'

const server = ws.link('wss://example.com')

server.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log(`[server] received data from client: ${data}`)
  })
})

const socket = new WebSocket('wss://example.com')

socket.addEventListener('open', () => {
  socket.send('from-client')
})
