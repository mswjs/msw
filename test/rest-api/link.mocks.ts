import { setupWorker, rest } from 'msw'

const explicitURLLink = rest.link('https://api.github.com')
const permissiveBaseLink = rest.link('*')
const regExpLink = rest.link(/github.com/i)

// Cases left
// Regexp + string
// string + Regexp

const worker = setupWorker(
  explicitURLLink.get('/users/:username', (req, res, ctx) => {
    const { username } = req.params
    return res(
      ctx.json({
        name: 'John Maverick',
        originalUsername: username,
      }),
    )
  }),

  permissiveBaseLink.get('/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { login: 'mojombo', id: 1 },
        { login: 'defunkt', id: 2 },
      ]),
    )
  }),

  regExpLink.get(/\/licenses$/, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          key: 'agpl-3.0',
          name: 'GNU Affero General Public License v3.0',
          spdx_id: 'AGPL-3.0',
          url: 'https://api.github.com/licenses/agpl-3.0',
          node_id: 'MDc6TGljZW5zZTE=',
        },
      ]),
    )
  }),
)

worker.start()
