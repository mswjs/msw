import { ws } from 'msw'

const server = ws.link('wss://api.mswjs.io')

server.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log(`[server] received data from client: ${data}`)
  })
})

const socket = new WebSocket('wss://api.mswjs.io')

socket.addEventListener('open', () => {
  socket.send('from-client')
})
