import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

Object.assign(window, {
  msw: {
    worker,
    graphql,
    HttpResponse,
  },
})
