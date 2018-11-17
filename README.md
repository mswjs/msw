## Motivation

### Problems of traditional mocking:

* Often relies on a mocking server which you need to run and maintain;
* Doesn't really mock requests, rather **replaces** requests' urls, so they go to the mocking server, instead of the production server;
* Brings extra dependencies to your application, instead of being a dependency-free development tool;

## Getting started

### Install

```bash
–
```

### Configure routes

```js
import { MSW } from 'not-published-yet'

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

## How does this work?

The library spawns a ServiceWorker that broadcasts any outgoing request on a page to the application. The listener then matches the request against the schema of mocking routes, and resolves with the mocked response whenever present.

## Browser support

Please note that this library is meant to be used for **development only**. It doesn't require nor encourage you to install any ServiceWorker on the production environment.

[**See browser support for ServiceWorkers**](https://caniuse.com/#feat=serviceworkers)
