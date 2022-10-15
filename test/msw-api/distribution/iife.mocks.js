const { setupWorker, rest, HttpResponse } = MockServiceWorker

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
