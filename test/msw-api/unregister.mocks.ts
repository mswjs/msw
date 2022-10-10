import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com', () => {
    return HttpResponse.json({
      mocked: true,
    })
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
