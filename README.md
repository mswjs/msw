# Getting started

## Install

–

## Configure routes

```js
import { MSW } from '-'

/* Create a new instance of MockServiceWorker */
const msw = new MSW()

/* Configure mocking routes */
msw.get('https://api.github.com/repo/:repoName', (req, res) => {
  /* Access request's params */
  const { repoName } = req.params

  res
    /* Set custom response status */
    .status(403)
    /* Set headers */
    .set({ 'Custom-Header': 'foo' })
    /* Delay the response */
    .delay(1000)
    /* Mock the body */
    .json({
      errorMessage: `Repository "${repoName}" not found`
    })
})

/* Start the Service Worker */
msw.start()
```

# How does this work?

We use a Service Worker that analyzes the outgoing requests and matches them against the specified mocking routes. Whenever a request matches a route, the handler function is executed, and the mock is being sent as a response to that request.
