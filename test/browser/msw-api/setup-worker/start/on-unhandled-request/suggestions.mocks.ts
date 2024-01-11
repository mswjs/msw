import { http, graphql } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start({
  // Set the `onUnhandledRequest` option to enable
  // smart suggestions for unhandled requests.
  onUnhandledRequest: 'warn',
})

Object.assign(window, {
  msw: {
    worker,
    http,
    graphql,
  },
})
