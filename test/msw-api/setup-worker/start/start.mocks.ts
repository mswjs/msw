import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.status(200))
  }),
)

// @ts-ignore
window.msw = {
  registration: worker.start().then((reg) => {
    console.log('Registration Promise resolved')
    return reg.constructor.name
  }),
}
