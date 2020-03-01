import { rest } from 'msw'

/**
 * Modularize large mocking definitions by exporting a list of response handlers.
 * No need to initialize or start anything here.
 */
export default [
  rest.get('https://api.backend.com/user/:username', (req, res, { json }) => {
    return res(json({ username: req.params.params.username }))
  }),
  rest.post(/user\/create/, (req, res, { json }) => {
    return res(json({ message: 'User has been created!' }))
  }),
]
