import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const createWorker = () => {
  return setupWorker(
    rest.get('/user', () => {
      return new HttpResponse()
    }),
  )
}

// @ts-ignore
window.msw = {
  createWorker,
}
