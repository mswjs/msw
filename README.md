<br />

<p align="center">
  <img src="media/msw-logo.svg" width="100" alt="Mock Service Worker logo" />
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
- **Deviation-free**. Request the same production resources and test the actual behavior of your app. Augment an existing API, or design it as you go when there is none.
- **Familiar & Powerful**. Use [Express](https://github.com/expressjs/express)-like routing syntax to capture requests. Use parameters, wildcards, and regular expressions to match requests, and respond with necessary status codes, headers, cookies, delays, or completely custom resolvers.

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

In-browser usage is what sets Mock Service Worker apart from other tools. Utilizing the [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), which can intercept requests for the purpose of caching, Mock Service Worker responds to captured requests with your mock definition on the network level. This way your application knows nothing about the mocking.

**Take a look at this quick presentation on how Mock Service Worker functions in a browser:**

[![What is Mock Service Worker?](https://raw.githubusercontent.com/mswjs/msw/main/media/msw-video-thumbnail.jpg)](https://youtu.be/HcQCqboatZk)

### How is it different?

- This library intercepts requests on the network level, which means _after_ they have been performed and "left" your application. As a result, the entirety of your code runs, giving you more confidence when mocking;
- Imagine your application as a box. Every API mocking library out there opens your box and removes the part that does the request, placing a blackbox in its stead. Mock Service Worker leaves your box intact, 1-1 as it is in production. Instead, MSW lives in a separate box next to yours;
- No more stubbing of `fetch`, `axios`, `react-query`, you-name-it;
- You can reuse the same mock definition for unit, integration, and E2E testing. Did we mention local development and debugging? Yep. All running against the same network description without the need for adapters of bloated configurations.

### Usage example

```js
// src/mocks.js
// 1. Import the library.
import { setupWorker, rest } from 'msw'

// 2. Describe network behavior with request handlers.
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

// 3. Start request interception by starting the Service Worker.
worker.start()
```

Performing a `GET https://github.com/octocat` request in your application will result into a mocked response that you can inspect in your browser's "Network" tab:

![Chrome DevTools Network screenshot with the request mocked](https://github.com/mswjs/msw/blob/main/media/msw-quick-look-network.png?raw=true)

> **Tip:** Did you know that although Service Worker runs in a separate thread, your mock definition executes entirely on the client? This way you can use the same languages, like TypeScript, third-party libraries, and internal logic to create the mocks you need.

## Node.js

- [Learn more about using MSW in Node.js](https://mswjs.io/docs/getting-started/integrate/node)
- [`setupServer` API](https://mswjs.io/docs/api/setup-server)

### How does it work?

There's no such thing as Service Workers in Node.js. Instead, MSW implements a [low-level interception algorithm](https://github.com/mswjs/interceptors) that can utilize the very same request handlers you have for the browser. This blends the boundary between environments, allowing you to focus on your network behaviors.

### How is it different?

- Does not stub `fetch`, `axios`, etc. As a result, your tests know _nothing_ about mocking;
- You can reuse the same request handlers for local development and debugging, as well as for testing. Truly a single source of truth for your network behavior across all environments and all tools.

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

## Sponsors

### Golden Sponsors

> Become our first golden sponsor and get featured right here, enjoying other perks like issue prioritization and a personal consulting session with us.
>
> **Learn more on our [GitHub Sponsors profile](https://github.com/sponsors/mswjs)**.

<br />

<a href="https://www.github.com/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/sponsors/github-light.svg" />
    <img src="media/sponsors/github.svg" alt="GitHub" width="75" />
  </picture>
</a>

### Silver Sponsors

> Become our _silver sponsor_ and get your profile image and link featured right here.
>
> **Learn more on our [GitHub Sponsors profile](https://github.com/sponsors/mswjs)**.

<br />

<a href="https://www.chromatic.com/" target="_blank">
  <img src="media/sponsors/chromatic.svg" alt="Chromatic" width="75" />
</a>

### Bronze Sponsors

> Become our first _bronze sponsor_ and get your profile image and link featured in this section.
>
> **Learn more on our [GitHub Sponsors profile](https://github.com/sponsors/mswjs)**.

## Awards & Mentions

<table>
  <tr valign="middle">
    <td width="124">
      <img src="https://raw.githubusercontent.com/mswjs/msw/main/media/tech-radar.png" width="124" alt="Technology Radar">
    </td>
    <td>
      <h4>Solution Worth Pursuing</h4>
      <p><em><a href="https://www.thoughtworks.com/radar/languages-and-frameworks/mock-service-worker">Technology Radar</a> (2020–2021)</em></p>
    </td>
  </tr>
  <tr>
    <td width="124">
      <img src="https://raw.githubusercontent.com/mswjs/msw/main/media/os-awards.png" width="124" alt="Open Source Awards 2020">
    </td>
    <td>
      <h4>The Most Exciting Use of Technology</h4>
      <p><em><a href="https://osawards.com/javascript/2020">Open Source Awards</a> (2020)</em></p>
    </td>
  </tr>
</table>
