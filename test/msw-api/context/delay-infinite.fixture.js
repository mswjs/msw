import { delay, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://any.host.here/irrelevant', async () => {
    const infiniteDelay = delay('infinite')
    server.close()
    await infiniteDelay
  }),
)

server.listen()

fetch('http://any.host.here/irrelevant')
