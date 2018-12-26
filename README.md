<h1 align="center">MSW</h1>

Serverless offline-first API mocking for your client applications.

## Features

- **Serverless**. Doesn't establish any servers, lives entirely in a browser.
- **Deviation-free**. Request the same resources you would in production, and let MSW handle response mocking of those that match your defined mocking routes.
- **Mocking as a tool**. Enable/disable/change mocking logic on runtime without any compilations or rebuilds. Control the MSW lifecycle from your browser's DevTools.

## Motivation

There are several points that I find annoying when conducting API mocking with any current solution:

- Often relies on a mocking server which you need to run and maintain;
- Doesn't really mock requests, rather **replaces** their urls to point to a mocking server, instead of a production server;
- Brings extra dependencies to your application, instead of being a dependency-free development tool.

To eliminate those, and make client-side development easier, I've created this library.

## Getting started

### Install

```bash
npm install msw --dev
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

## How does it work?

MSW uses Service Worker API with its primarily ability to intercept requests, but instead of caching them, it immitates their responses.

1. MSW spawns a dedicated Service Worker and a communication channel between it and the client.
1. Service Worker then signals any outgoing requests on the page to the MSW, which attempts to match them against the defined mocking routes.
1. When any match occurs, the `resolver` function is executed, and its payload is returned as the mocked response.

## Browser support

MSW is meant to be used for **development only**. It doesn't require, nor encourage you to install any Service Worker on the production environment.

> [**See browser support for ServiceWorkers**](https://caniuse.com/#feat=serviceworkers)
