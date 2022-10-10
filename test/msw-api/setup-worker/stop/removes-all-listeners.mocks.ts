import { setupWorker, rest, HttpResponse } from 'msw'

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
