// @ts-check

import { delay, HttpResponse, http } from '../../../../lib/core/index.mjs'
import { setupServer } from '../../../../lib/node/index.mjs'

const server = setupServer(
  http.get('http://localhost/user', async () => {
    await delay('infinite')
    return HttpResponse.text('john')
  }),
)

server.listen()
fetch('http://localhost/user').catch(() => undefined)

setTimeout(() => {
  server.close()
}, 20)
