import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start({
  onUnhandledRequest(request, print) {
    console.log(`Oops, unhandled ${request.method} ${request.url}`)
    const url = new URL(request.url)

    if (url.pathname.includes('/use-warn')) {
      // Using "print" allows you to execute the default strategy.
      print.warning()
    } else {
      print.error()
    }
  },
})
