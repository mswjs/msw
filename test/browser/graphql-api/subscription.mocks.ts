import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'
import { createClient } from 'graphql-ws'

const worker = setupWorker()
worker.start()

window.msw = {
  // @ts-expect-error
  worker,
  graphql,
  createClient,
}
