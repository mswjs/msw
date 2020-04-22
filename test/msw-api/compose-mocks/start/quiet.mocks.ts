import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.json({
        firstName: 'John',
        age: 32,
      }),
    )
  }),
)

// @ts-ignore
window.__MSW_REGISTRATION__ = start({
  // Disable logging of matched requests into browser's console
  quiet: true,
})
