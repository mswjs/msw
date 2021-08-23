import { ws } from 'msw'

// Create a WebSocket link that intercepts any events sent
// or received from a particular endpoint.
const server = ws.link('wss://example.com')

server.on('connection', (ws) => {
  // Send a message to any connected client.
  ws.send('john')
})

// Create a client-side instance of WebSocket.
const socket = new WebSocket('wss://example.com')

// Subscribe to the incoming events from the server.
socket.addEventListener('message', (event) => {
  console.log(`[client] received message: ${event.data}`)
})
