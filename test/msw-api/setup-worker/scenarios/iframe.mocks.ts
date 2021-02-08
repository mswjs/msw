import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start()

// Append an iframe to the body and issue a request from it.
const iframe = document.createElement('iframe')
iframe.setAttribute('src', '/test/fixtures/iframe.html')
document.body.appendChild(iframe)
