import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.status(200))
  }),
)

// @ts-ignore
window.__MSW_REGISTRATION__ = start().then((reg) => {
  console.log('Registration Promise resolved')
  return reg.constructor.name
})
