## Motivation

### Problems of traditional mocking:

- Often relies on a mocking server which you need to run and maintain;
- Doesn't really mock requests, rather **replaces** their urls to point to a mocking server, instead of a production server;
- Brings extra dependencies to your application, instead of being a dependency-free development tool;

### Benefits of `msw`:

- **Serverless**. Doesn't establish any mocking servers whatsoever;
- **Deviation-free**. Request the same resources as you would in production, let the library handle response mocking of those that match your defined routes;
- **A tool**. Mocking is a development process, thus enable/disable it at any point, change the routes without any rebuilds, control the lifecycle from your browser's DevTools;

## Getting started

### Install

```bash
npm install msw --save-dev
```

### Use

```js
// app/mocks.js
import { msw } from 'msw'

/* Configure mocking routes */
msw.get(
  'https://api.github.com/repo/:repoName',
  (req, res, { status, set, delay, json }) => {
    const { repoName } = req.params // access request's params

    return res(
      status(403), // set custom status
      set({ 'Custom-Header': 'foo' }), // set headers
      delay(1000), // delay the response
      json({ errorMessage: `Repository "${repoName}" not found` }),
    )
)

/* Start the Service Worker */
msw.start()
```

Import your `mocks.js` module anywhere in your application to enable the mocking:

```js
// app/index.js
import './mocks.js'
```

## How does this work?

The library spawns a ServiceWorker that notifies the library about any outgoing requests from your application. A request is than matched against the mocking routes you have defined, and is mocked with the first match.

## Browser support

Please note that this library is meant to be used for **development only**. It doesn't require nor encourage you to install any ServiceWorker on the production environment.

[**See browser support for ServiceWorkers**](https://caniuse.com/#feat=serviceworkers)
