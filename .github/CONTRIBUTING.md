# Contributing

Hey! Thank you for deciding to contribute to Mock Service Worker! This page will help you land your first contribution by giving you a better understanding about the project's structure, dependencies, and development workflow.

## Tools

Getting yourself familiar with the tools below will substantially ease your contribution experience.

- [TypeScript](https://www.typescriptlang.org/)
- [Jest](https://jestjs.io/)

## Dependencies

Mock Service Worker depends on multiple other libraries.

| Library name                                                | Purpose                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| [cookies](https://github.com/mswjs/cookies)                 | Enables cookies persistance and inference between environments.          |
| [headers-utils](https://github.com/mswjs/headers-utils)     | `Headers` polyfill to manage request/response headers.                   |
| [interceptors](https://github.com/mswjs/interceptors)       | Provisions request interception in Node.js (internals of `setupServer`). |
| [node-match-path](https://github.com/mswjs/node-match-path) | Matches a request URL against a path.                                    |

There are cases when an issue originates from one of the said dependencies. Don't hesitate to address it in the respective repository, as they all are governed by the same team.

## Getting started

### Fork the repository

Please use the GitHub UI to [fork this repository](https://github.com/mswjs/msw) (_read more about [Forking a repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo)_). Mock Service Worker has forked builds enabled in the CI, so you will see the build status of your fork's branch.

### Install

```bash
$ cd msw
$ yarn install
$ yarn start
```

> Please use [Yarn][yarn-url] while working on this project.

## Git workflow

```bash
# Checkout the default branch and ensure it's up-to-date
$ git checkout main
$ git pull --rebase

# Create a feature branch
$ git checkout -b feature/graphql-subscriptions

# Commit the changes
$ git add .
$ git commit
# Follow the interactive prompt to compose a commit message

# Push
$ git push -u origin feature/graphql-subscriptions
```

We are using [Conventional Commits](https://conventionalcommits.org/) naming convention. It helps us automate library releases and ensure clean and standardized commit tree. Please take a moment to read about the said convention before you name your commits.

> **Tip:** running `git commit` will open an interactive prompt in your terminal. Follow the prompt to compose a valid commit message.

Once you have pushed the changes to your remote feature branch, [create a pull request](https://github.com/open-draft/msw/compare) on GitHub. Undergo the process of code review, where the maintainers of the library will help you get the changes from good to great, and enjoy your implementation merged to the default branch.

> Please be respectful when requesting and going through the code review. Everyone on the team is interested in merging quality and well tested code, and we're hopeful that you have the same goal. It may take some time and iterations to get it right, and we will assist you throughout the process.

## Tests

### Testing levels

There are two levels of tests on the project:

- [Unit tests](#unit-tests), cover small independent functions.
- [Integration tests](#integration-tests), test in-browser usage scenarios.

**Always begin your implementation from tests**. When tackling an issue, a test for it must be missing, or is incomplete. When working on a feature, starting with a test allows you to model the feature's usage before diving into implementation.

### Unit tests

#### Writing a unit test

Unit tests are placed next to the tested code. For example, if you're testing a newly added `multiply` function, create a `multiple.test.ts` file next to where the function is located:

```bash
$ touch src/utils/multiply.test.ts
```

Proceed by writing a unit test that resembles the usage of the function. Make sure to cover all the scenarios

```ts
// src/utils/multiply.test.ts
import { multiply } from './multiply'

test('multiplies two given numbers', () => {
  expect(multiply(2, 3)).toEqual(6)
})
```

> Please [avoid nesting](https://kentcdodds.com/blog/avoid-nesting-when-youre-testing/) while you're testing.

#### Running a single unit test

Once your test is written, run it in isolation.

```bash
$ yarn test:unit src/utils/multiply.test.ts
```

At this point, the actual implementation is not ready yet, so you can expect your test to fail. **That's perfect**. Add the necessary modules and logic, and gradually see your test cases pass.

#### Running all unit tests

```bash
$ yarn test:unit
```

### Integration tests

We follow an example-driven testing paradigm, meaning that each integration test represents a _usage example_. Mock Service Worker can be used in different environments (browser, Node.js), making such usage examples different.

> **Make sure that you [build the library](#build) before running the integration tests**. It's a good idea to keep the build running (`yarn start`) while working on the tests. Keeping both compiler and test runner in watch mode boosts your productivity.

#### Browser integration tests

In-browser integration tests are powered by the [page-with][page-with-url] library (Chrome automation tool) and still run in Jest. These tests usually consists of two parts:

- `[test-name].mocks.ts`, the actual usage example.
- `[test-name].test.ts`, the test suite that loads the usage example, does actions and performs assertions.

Let's write an integration test that asserts the interception of a GET request. First, start with the `*.mocks.ts` file:

```js
// test/rest-api/basic.mocks.ts
import { rest, setupWorker } from 'msw'

const worker = setupWorker(
  rest.get('/books', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
          title: 'The Lord of the Rings',
          publishedAt: -486867600,
        },
      ]),
    )
  }),
)

worker.start()
```

> Notice how there's nothing test-specific in the example? The `basic.mocks.ts` file is a copy-paste example of intercepting the `GET /books` request. This allows to share these mocks with the users as a legitimate example, because it is!

Once the `*.mocks.ts` file is written, proceed by creating a test file:

```ts
// test/rest-api/basic.test.ts
import * as path from 'path'
import { pageWith } from 'page-with'

test('returns a mocked response', async () => {
  // Create a Chrome instance with the usage example loaded.
  const runtime = await pageWith({
    example: path(__dirname, 'basic.mocks.ts'),
  })

  // Dispatch a "GET /books" request.
  const res = await runtime.request('/books')

  expect(await res.json()).toEqual([
    {
      id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
      title: 'The Lord of the Rings',
      publishedAt: -486867600,
    },
  ])
})
```

> Read more about all the `page-with` features in its [documentation](https://github.com/kettanaito/page-with).

#### Node.js integration test

Integration tests showcase a usage example in Node.js and are often placed next to the in-browser tests. A Node.js integration test file has the `*.node.test.ts` suffix.

Similar to the browser tests, these are going to contain a usage example and the assertions over it. However, for Node.js tests there is no need to create a separate `*.mocks.ts` file. Instead, keep the usage example in the test file directly.

Let's replicate the same `GET /books` integration test in Node.js.

```ts
// test/setup-server/basic.test.ts
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/books', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
          title: 'The Lord of the Rings',
          publishedAt: -486867600,
        },
      ]),
    )
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('returns a mocked response', async () => {
  const res = await fetch('/books')
  expect(await res.json()).toEqual([
    {
      id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
      title: 'The Lord of the Rings',
      publishedAt: -486867600,
    },
  ])
})
```

#### Running all integration tests

```bash
$ yarn test:integration
```

#### Running a single integration test

```bash
$ yarn test:integration test/rest-api/basic.test.ts
```

## Build

Build the library with the following command:

```bash
$ yarn build
```

> Learn more about the build in the [Rollup configuration file](../rollup.config.ts).

[yarn-url]: https://classic.yarnpkg.com/en/
[jest-url]: https://jestjs.io
[page-with-url]: https://github.com/kettanaito/page-with
