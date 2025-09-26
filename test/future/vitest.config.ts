import fs from 'node:fs'
import { defineConfig } from 'vitest/config'
import {} from '@vitest/browser'
import { matchRequestUrl } from '../../src/core/utils/matching/matchRequestUrl.js'

const WORKER_SCRIPT_URL = new URL(
  '../../lib/mockServiceWorker.js',
  import.meta.url,
)

export default defineConfig({
  test: {
    root: './test/future',
    testTimeout: 5000,
    globals: true,
    browser: {
      enabled: true,
      headless: !process.env.DEBUG,
      provider: 'playwright',
      screenshotFailures: false,
      instances: [
        {
          browser: 'chromium',
          launch: {
            devtools: !!process.env.DEBUG,
          },
        },
      ],
    },
  },
  plugins: [
    // {
    //   enforce: 'pre',
    //   name: 'internal:vitest-browser-plugin',
    //   configureServer(server) {
    //     console.log('SERVER!')
    //     server.middlewares.use((req, res, next) => {
    //       if (!req.url) {
    //         return next()
    //       }
    //       console.log('???')
    //     })
    //   },
    // },
    {
      name: 'internal:static-assets-plugin',
      configureServer(server) {
        // server.middlewares.use('/t', (req, res, next) => {
        //   const url = new URL(
        //     req.url,
        //     req.headers.referer || 'http://lolcahost:63315/',
        //   )
        //   const match = matchRequestUrl(url, '*/:sessionId/:iframeId/:taskId/')
        //   console.log(req.url, { match })
        //   if (match.matches) {
        //     const destinationUrl = new URL(
        //       `/?sessionId=${match.params.sessionId}&iframeId=${match.params.iframeId}`,
        //       match.params[0] as string,
        //     )
        //     res.writeHead(302, { location: destinationUrl.href })
        //     res.end()
        //     return
        //   }
        //   next()
        // })
        // server.middlewares.use((req, res, next) => {
        //   if (!req.url) return next()
        //   // Match Vitest iframe pattern with sessionId + file query params
        //   const u = new URL(req.url, 'http://localhost')
        //   const sessionId = u.searchParams.get('sessionId')
        //   const file = u.searchParams.get('iframeId')
        //   if (sessionId && file) {
        //     const safeFile = encodeURIComponent(file)
        //     req.url = `/t/${sessionId}/${safeFile}${u.hash || ''}`
        //   }
        //   next()
        // })

        server.middlewares.use('/mockServiceWorker.js', async (req, res) => {
          res.setHeader('content-type', 'application/javascript; charset=utf8')
          res.setHeader('content-encoding', 'chunked')
          fs.createReadStream(WORKER_SCRIPT_URL).pipe(res)
        })
      },
    },
  ],
})
