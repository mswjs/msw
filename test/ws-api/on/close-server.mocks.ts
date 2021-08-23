import { ws } from 'msw'

const server = ws.link('wss://example.com')

server.on('close', () => {
  console.log('[server] closed')
})

server.close()

const client = new WebSocket('wss://example.com')
client.send('john')
