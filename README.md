<p align="center">
  <a href="https://www.npmjs.com/package/msw">
    <img src="https://img.shields.io/npm/v/msw.svg" alt="Package version" />
  </a>
  <a href="https://circleci.com/gh/kettanaito/msw)">
    <img src="https://img.shields.io/circleci/project/github/kettanaito/msw/master.svg" alt="Build status" />
  </a>
</p>

<h1 align="center">MSW</h1>

<p align="center">Serverless offline client-side API mocking for your applications.</p>

## Features

- **Serverless**. Doesn't establish any servers, lives entirely in a browser;
- **Deviation-free**. Request the very same resources (urls) you would in production, and let MSW handle the mocking of the respective responses;
- **Mocking as a tool**. Enable/disable/change mocking logic on runtime instantly without any compilations or rebuilds. Control the MSW lifecycle from your browser's DevTools.
- **Essentials**. Emulate status codes, headers, delays, and create custom response mocking functions.

## Motivation

There are several points that I find annoying when conducting API mocking with any solution I've found:

- Often relies on a mocking server which you need to run and maintain;
- Doesn't really mock requests, rather _replaces_ their urls to point to a mocking server, instead of a real server;
- Brings extra dependencies to your application, instead of being a simple dependency-free development tool.

This library aims to annihilate those problems, as it takes an entirely different approach to the client-side API mocking.

## Getting started

### 1. Install

First, install `msw` with any package manager (npm, yarn, etc.).

```bash
yarn install msw --dev
```

### 2. Configure

Run the following command in your project's root directory:

```bash
node_modiles/.bin/msw init <publicDir>
```

> Replace `publicDir` with the relative path to your server's public directory (i.e. `msw init public`).

This is going to copy the Mock Service Worker file to the specified `publicDir` location, so it's served as a static file. This makes it possible for a browser to access and register the referenced service worker.

#### Where is my "public" directory?

This is usually the build directory of your application (`build/`, `public/` or `dest/`). This directory is often _committed to Git_, so should be the Mock Service Worker. You can also integrate service worker generation as a part of your build step.

### 3. Define mocks

First, create a mocking definition file:

```js
// app/mocks.js
import { composeMocks, rest } from 'msw'

/* Configure mocking routes */
const { start } = composeMocks(
  rest.get('https://api.github.com/repo/:repoName',
  (req, res, { status, set, delay, json }) => {
    const { repoName } = req.params // access request's params

    return res(
      status(403), // set custom status
      set({ 'Custom-Header': 'foo' }), // set headers
      delay(1000), // delay the response
      json({ errorMessage: `Repository "${repoName}" not found` }),
    )
  )
)

/* Start the Service Worker */
start()
```

> You can modularize your mocking files, but be sure to call `start()` **only once!**

### 4. Integrate

Mocking is a **development-only** procedure. We highly recommend to include your mocking module (`app/mocks.js`) into your application's entry during the build. Please see examples of how this can be done below.

#### Using webpack

```js
// ./webpack.config.js
const __DEV__ = process.env.NODE_ENV === 'development'

module.exports = {
  entry: [
    /* Include mocks when in development */
    __DEV__ && 'app/mocks.js',

    /* Include your application's entry */
    'app/index.js',
  ].filter(Boolean),

  /* Rest of your config here */
}
```

#### Client-side import

Alternatively, you can import mocking file(s) conditionally in your client bundle.

```js
// app/index.js

if (__DEV__) {
  require('./mocks.js')
}
```

## Update on reload

Service Workers are designed as a caching tool. However, we don't want our mocking definitions to be cached, which would result into out-of-date logic during development.

It's highly recommend to **enable "Update on reload"** option in the "Application" tab of Chrome's DevTools (under "Service Workers" section). This will force Service Worker to update on each page reload, ensuring the latest logic is applied.

![Service Workers: Update on reload](https://raw.githubusercontent.com/kettanaito/msw/master/media/sw-update-on-reload.png)

> Read more on [The Service Worker Lifecycle](https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle).

## How does it work?

MSW (stands for "Mock Service Worker") uses Service Worker API with its primary ability to intercept requests, only instead of caching responses it immitates them. In a nutshell, it works as follows:

1. MSW spawns a dedicated Service Worker and creates a communication channel between the worker and the client.
1. Service Worker then signals any outgoing requests on the page to the MSW, which attempts to match them against the defined mocking routes.
1. When any match occurs, the `resolver` function is executed, and its payload is returned as the mocked response.

## Browser support

This library is meant to be used for **development only**. It doesn't require, nor encourage to install any Service Worker on the production environment.

> [**See browser support for ServiceWorkers**](https://caniuse.com/#feat=serviceworkers)

## Contribute

Have an idea? Found a bug? Please communicate it through using the [issues](https://github.com/kettanaito/msw/issues) tab of this repository. [Pull requests](https://github.com/kettanaito/msw/pulls) are welcome as well!
