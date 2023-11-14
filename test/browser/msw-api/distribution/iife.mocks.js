const { setupWorker, http, HttpResponse } = MockServiceWorker

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
