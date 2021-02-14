import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

// @ts-ignore
window.msw = {
  worker,
  createIframe: (id: string, src: string) => {
    // Append an iframe to the body and issue a request from it.
    const iframe = document.createElement('iframe')
    iframe.id = id
    iframe.setAttribute('src', src)
    document.body.appendChild(iframe)
  },
}
