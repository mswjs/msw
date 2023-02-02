import { setupWorker, rest, graphql } from 'msw'

const worker = setupWorker()

worker.start({
  // Set the `onUnhandledRequest` option to enable
  // smart suggestions for unhandled requests.
  onUnhandledRequest: 'warn',
})

// @ts-ignore
window.msw = {
  worker,
  rest,
  graphql,
}
