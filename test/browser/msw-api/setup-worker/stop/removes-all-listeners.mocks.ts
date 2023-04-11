import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const createWorker = () => {
  return setupWorker(
    rest.get('/user', () => {
      return HttpResponse.plain()
    }),
  )
}

// @ts-ignore
window.msw = {
  createWorker,
}
