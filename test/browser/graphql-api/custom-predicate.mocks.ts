import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

window.msw = {
  // @ts-expect-error
  worker,
  graphql,
}
