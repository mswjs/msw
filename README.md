<p align="center">
  <img src="media/msw-logo.svg" width="120" alt="Mock Service Worker logo" />
</p>

<h1 align="center">Mock Service Worker</h1>
<p align="center">Mock Service Worker (MSW) is an API mocking library for browser and Node.js.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/msw" target="_blank">
    <img src="https://img.shields.io/npm/v/msw.svg?style=for-the-badge&label=Latest&color=black" alt="Package version" />
  </a>
  <a href="https://circleci.com/gh/mswjs/msw" target="_blank">
    <img src="https://img.shields.io/circleci/project/github/mswjs/msw/master.svg?style=for-the-badge&color=black" alt="Build status" />
  </a>
  <a href="https://www.npmjs.com/package/msw" target="_blank">
    <img src="https://img.shields.io/npm/dm/msw?style=for-the-badge&color=black" alt="Downloads per month" />
  </a>
   <a href="https://kcd.im/discord" target="_blank">
    <img src="https://img.shields.io/badge/chat-online-green?style=for-the-badge&color=black" alt="Discord server" />
  </a>
</p>

<br />

## Features

- **Seamless**. A dedicated layer of requests interception at your disposal. Keep your application's code and tests unaware of whether something is mocked or not.
- **Deviation-free**. Request the same production resources and test the actual behavior of your app. Augment an existing API, or design it as you go, when there is none.
- **Familiar & Powerful**. Use [Express](https://github.com/expressjs/express)-like routing syntax to capture outgoing requests. Use parameters, wildcards, and regular expressions to match requests, and respond with necessary status codes, headers, cookies, delays, or completely custom resolvers.

---

> "_I found MSW and was thrilled that not only could I still see the mocked responses in my DevTools, but that the mocks didn't have to be written in a Service Worker and could instead live alongside the rest of my app. This made it silly easy to adopt. The fact that I can use it for testing as well makes MSW a huge productivity booster._"
>
> – [Kent C. Dodds](https://twitter.com/kentcdodds)

## Documentation

- [Documentation](https://mswjs.io/docs)
- [**Getting started**](https://mswjs.io/docs/getting-started/install)
- [Recipes](https://mswjs.io/docs/recipes)
- [FAQ](https://mswjs.io/docs/faq)

## Examples

- See the list of [**Usage examples**](https://github.com/mswjs/examples)

## Browser

- [Learn more about using MSW in a browser](https://mswjs.io/docs/getting-started/integrate/browser)
- [`setupWorker` API](https://mswjs.io/docs/api/setup-worker)

### How does it work?

Browser usage is what sets Mock Service Worker apart from other tools. Utilizing the [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), which can intercept requests for the purpose of caching, Mock Service Worker responds to captured requests with your mock definition on the network level. This way your application knows nothing about the mocking.

**Watch a 30 seconds explanation on how Mock Service Worker works in a browser:**

[![What is Mock Service Worker?](https://raw.githubusercontent.com/mswjs/msw/master/media/msw-video-thumbnail.jpg)](https://youtu.be/HcQCqboatZk)

### How is it different?

- Intercepts requests on the network level, not the application level.
- If you think of your application as a box, Mock Service Worker lives in its own box next to yours, instead of opening and altering it for the purpose of mocking.
- Agnostic of request-issuing libraries, so you can use it with `fetch`, `axios`, `react-query`, you-name-it.
- The same mock definition can be reused for unit, integration, E2E testing, and debugging.

### Usage example

```js
// src/mocks.js
// 1. Import mocking utils.
import { setupWorker, rest } from 'msw'

// 2. Define request handlers and response resolvers.
const worker = setupWorker(
  rest.get('https://github.com/octocat', (req, res, ctx) => {
    return res(
      ctx.delay(1500),
      ctx.status(202, 'Mocked status'),
      ctx.json({
        message: 'Mocked response JSON body',
      }),
    )
  }),
)

// 3. Start the Service Worker.
worker.start()
```

Performing a `GET https://github.com/octocat` request in your application will result into a mocked response that you can inspect in your browser's "Network" tab:

![Chrome DevTools Network screenshot with the request mocked](https://github.com/open-draft/msw/blob/master/media/msw-quick-look-network.png?raw=true)

> **Tip:** Did you know that although Service Worker runs in a separate thread, your mock definition executes on the client-side? That way you can use the same languages (i.e. TypeScript), third-party libraries, and internal logic in mocks.

## Node

- [Learn more about using MSW in Node.js](https://mswjs.io/docs/getting-started/integrate/node)
- [`setupServer` API](https://mswjs.io/docs/api/setup-server)

### How does it work?

Although Service Worker is a browser-specific API, this library allows reusing of the same mock definition to have API mocking in Node.js through augmenting native request issuing modules.

### How is it different?

- Prevents from stubbing `fetch`/`axios`/etc. as a part of your test, allowing you to treat API mocking as a pre-requisite and focus on what actually matters during testing.
- The same mock definition you use for local development can be reused for testing.

### Usage example

Here's an example of an actual integration test in Jest that uses [React Testing Library](https://github.com/testing-library/react-testing-library) and Mock Service Worker:

```js
// test/LoginForm.test.js
import '@testing-library/jest-dom'
import React from 'react'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../src/components/Login'

const server = setupServer(
  rest.post('/login', (req, res, ctx) => {
    // Respond with a mocked user token that gets persisted
    // in the `sessionStorage` by the `Login` component.
    return res(ctx.json({ token: 'mocked_user_token' }))
  }),
)

// Enable API mocking before tests.
beforeAll(() => server.listen())

// Reset any runtime request handlers we may add during the tests.
afterEach(() => server.resetHandlers())

// Disable API mocking after the tests are done.
afterAll(() => server.close())

test('allows the user to log in', async () => {
  render(<Login />)
  userEvent.type(
    screen.getByRole('textbox', { name: /username/i }),
    'john.maverick',
  )
  userEvent.type(
    screen.getByRole('textbox', { name: /password/i }),
    'super-secret',
  )
  userEvent.click(screen.getByText(/submit/i))
  const alert = await screen.findByRole('alert')

  // Assert successful login state
  expect(alert).toHaveTextContent(/welcome/i)
  expect(window.sessionStorage.getItem('token')).toEqual(fakeUserResponse.token)
})

test('handles login exception', () => {
  server.use(
    rest.post('/login', (req, res, ctx) => {
      // Respond with "500 Internal Server Error" status for this test.
      return res(
        ctx.status(500),
        ctx.json({ message: 'Internal Server Error' }),
      )
    }),
  )

  render(<Login />)
  userEvent.type(
    screen.getByRole('textbox', { name: /username/i }),
    'john.maverick',
  )
  userEvent.type(
    screen.getByRole('textbox', { name: /password/i }),
    'super-secret',
  )
  userEvent.click(screen.getByText(/submit/i))

  // Assert meaningful error message shown to the user
  expect(alert).toHaveTextContent(/sorry, something went wrong/i)
  expect(window.sessionStorage.getItem('token')).toBeNull()
})
```

> **Tip:** Did you know that although the API is called `setupServer`, there are no actual servers involved? The name is chosen for familiarity, and the API is designed to resemble operating with an actual server.

## Awards & Mentions

<br />

<img src="https://raw.githubusercontent.com/open-draft/msw/master/media/os-awards-2020.png" width="160" alt="Open Source Awards 2020" />
