# Motivation

**Problems of traditional mocking:**

* Often relies on a mocking server which you need to run and maintain;
* Doesn't really mock the requests, rather **replaces** the requests, so they go to the mocking server, instead of the production server;
* Brings extra dependencies to your application, instead of being a dependency-free development tool;

# Getting started

## Install

```bash
–
```

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

MSW uses a Service Worker that analyzes the outgoing requests and matches them against the specified mocking routes. Whenever a request matches a route, the handler function is executed, and the mock is being sent as a response to that request.
