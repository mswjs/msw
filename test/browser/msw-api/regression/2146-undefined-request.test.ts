/**
 * @see https://github.com/mswjs/msw/issues/2146
 */
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '../../playwright.extend'

test('ignores requests from the client missing in the list of active clients', async ({
  loadExample,
  context,
  fetch,
}) => {
  const { compilation } = await loadExample(
    require.resolve('./2146-undefined-request.mocks.ts'),
    {
      // Use a custom markup because the issue is triggered
      // when an asset request is performed on the page.
      markup: path.join(__dirname, './2146-index.html'),
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/asset.js', (_, res) => {
            fs.createReadStream(path.join(__dirname, '2146-asset.js')).pipe(res)
          })

          router.get('/resource', (_, res) => {
            res.send('original response')
          })

          //           router.get('/mockServiceWorker.js', async (req, res) => {
          //             console.log(req.headers.cookie)
          // 						const shouldDelayWorker = req.headers.cookies?.includes("delayWorker=1")
          //             const response = await globalThis.fetch(
          //               new URL('/mockServiceWorker.js', compilation.previewUrl),
          //             )
          //             const workerScript = await response.text()

          // 						// Serve the modified worker script to ALL clients.
          // 						// It is the first page that registers the worker script
          // 						// but we need to delay the active client registration for the second page.
          //             const modifiedWorkerScript =
          //               workerScript +
          //               `
          // activeClientIds.add = new Proxy(activeClientIds.add, {
          //   apply(target, thisArg, args) {
          // 		return Reflect.apply(target, thisArg, args)
          // 	}
          // })
          // 							`

          //             res.set(Object.fromEntries(response.headers.entries()))
          //             res.send(modifiedWorkerScript)
          //           })
        })
      },
    },
  )

  // const firstPage = await context.newPage()
  // await firstPage.goto(compilation.previewUrl)
  fetch('./resource')

  // This issue is only reproducible with multiple tabs.
  const secondPage = await context.newPage()

  await secondPage.goto(compilation.previewUrl)

  await secondPage.evaluate(() => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('state change', navigator.serviceWorker.controller?.state)
    })

    navigator.serviceWorker.ready.then(() => {
      const { controller } = navigator.serviceWorker

      console.log('CONTROLLED BY WORKER')

      if (controller) {
        const { postMessage } = controller

        controller.postMessage = new Proxy(controller.postMessage, {
          apply(target, thisArg, args) {
            const apply = () => Reflect.apply(target, thisArg, args)

            const [message] = args
            console.log(message)

            if (message === 'MOCK_ACTIVATE') {
              console.warn('client sends active message!')
              setTimeout(() => apply(), 2000)
              return
            }

            return apply()
          },
        })
      }
    })
  })

  await fetch('./resource', {}, { page: secondPage })

  await secondPage.pause()
  // console.log(response.status())
  // ...
})
