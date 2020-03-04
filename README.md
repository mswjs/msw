<p align="center">
  <a href="https://www.npmjs.com/package/msw" target="_blank">
    <img src="https://img.shields.io/npm/v/msw.svg" alt="Package version" />
  </a>
  <a href="https://circleci.com/gh/open-draft/msw" target="_blank">
    <img src="https://img.shields.io/circleci/project/github/open-draft/msw/master.svg" alt="Build status" />
  </a>
  <a href="https://david-dm.org/open-draft/msw" target="_blank">
    <img src="https://img.shields.io/david/open-draft/msw.svg" alt="Dependencies status" />
  </a>
  <a href="https://david-dm.org/open-draft/msw?type=dev" target="_blank">
    <img src="https://img.shields.io/david/dev/open-draft/msw.svg" alt="Dev dependencies status" />
  </a>
</p>

<h1 align="center">MSW</h1>

<p align="center">Mock Service Worker (MSW) is a client-side API mocking library that operates by intercepting outgoing requests using Service Workers.</p>

## Features

- **Server-less**. Doesn't establish any servers, operating entirely in a browser;
- **Deviation-free**. Intercepts production URI requests from your page and mocks their responses, without having to deal with mocked URI.
- **Mocking as a tool**. Enable/change/disable mocking on runtime _instantly_ without any compilations or rebuilds. Control the MSW lifecycle from your browser's DevTools;
- **Essentials**. Use [Express](https://github.com/expressjs/express/)-like syntax to define which requests to mock. Respond with custom status codes, headers, delays, or create custom response resolvers.

## Documentation

- [Documentation](https://redd.gitbook.io/msw)
- [**Getting started**](https://redd.gitbook.io/msw/getting-started)
- [Recipes](https://redd.gitbook.io/msw/recipes)

## Quick look

```bash
$ npm install msw --save-dev
```

Now we have to put the `mockServiceWorker.js` file in your **public directory**. That is usually a directory being served by your server (i.e. `public/` or `dist/`). The placing of the file is done by running the following command from your project's root directory:

```bash
$ npx msw init <PUBLIC_DIR>
```

> For example, in a Create React App you would have to run: `npx msw init public/`.

MSW workflow consist of three phases:

```js
// src/mocks.js
// 1. Import mocking utils
import { composeMocks, rest } from 'msw'

// 2. Define request handlers and response resolvers
const { start } = composeMocks(
  rest.get('https://github.com/octocat', (req, res, ctx) => {
    return res(
      ctx.delay(1500),
      ctx.status(403, 'Made up status'),
      ctx.json({
        message: 'This is a mocked error',
      }),
    )
  }),
)

// 3. Start the Service Worker
start()
```

Import the `mocks.js` module into your application to enable the mocking.

```js
// src/index.js
import './mocks'
```

Once enabled, any requests matching the defined paths will be intercepted by Service Worker, which would respond with mocked responses.

![Chrome DevTools Network screenshot with the request mocked](https://github.com/open-draft/msw/blob/master/media/msw-quick-look-network.png?raw=true)

> Notice the `403 Made up status (from ServiceWorker)` status in the response.

There is a set of step-by-step tutorials to get you started with mocking the API type you need. Please refer to those tutorials below for more detailed instructions.

## Tutorials

- [Mocking REST API](https://redd.gitbook.io/msw/tutorials/mocking-rest-api)

## Examples

- [Using MSW with **Create React App**](https://github.com/open-draft/msw/tree/master/examples/create-react-app)
