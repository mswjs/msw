import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

Object.assign(window, {
  msw: {
    setupWorker,
    http,
    HttpResponse,
  },
})
