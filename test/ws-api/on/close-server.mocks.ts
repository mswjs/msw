import { ws } from 'msw'

const server = ws.link('wss://api.mswjs.io')

server.on('close', () => {
  console.log('[server] closed')
})

server.close()

const client = new WebSocket('wss://api.mswjs.io')
client.send('john')
