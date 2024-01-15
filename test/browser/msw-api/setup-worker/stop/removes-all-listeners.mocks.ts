import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const createWorker = () => {
  return setupWorker(
    http.get('/user', () => {
      return new HttpResponse()
    }),
  )
}

Object.assign(window, {
  msw: {
    createWorker,
  },
})
