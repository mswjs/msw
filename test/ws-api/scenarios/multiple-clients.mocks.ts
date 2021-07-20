import { ws } from 'msw'

const server = ws.link('wss://mswjs.io/ws')

server.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log(`[server] received message: ${data}`)

    ws.send('hello from server')
  })
})

const client = new WebSocket('wss://mswjs.io/ws')

client.addEventListener('message', (event) => {
  console.log(`[client] received message: ${event.data}`)
})

document.body.addEventListener('click', () => {
  client.send('hello from client')
})
