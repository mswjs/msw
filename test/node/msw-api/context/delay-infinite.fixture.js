import { delay, HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://any.host.here/irrelevant', async () => {
    await delay('infinite')
  }),
)

server.listen()

fetch('http://any.host.here/irrelevant')

setTimeout(() => {
  server.close()
}, 20)
