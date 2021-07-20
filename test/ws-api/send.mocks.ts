import { ws } from 'msw'

// Create a WebSocket link that intercepts any events sent
// or received from this WebSocket server.
const server = ws.link('wss://api.mswjs.io')

server.on('connection', (ws) => {
  ws.send('john')
})

// Create a client-side instance of WebSocket.
const socket = new WebSocket('wss://api.mswjs.io')

// Subscribe to the incoming events from the server.
socket.addEventListener('message', (event) => {
  console.log(`[client] received message: ${event.data}`)
})
