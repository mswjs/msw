# Contributing

Hey! Thank you for deciding to contribute to Mock Service Worker! This page will help you land your first contribution by giving you a better understanding about the project's structure, dependencies, and development workflow.

## Tools

Getting yourself familiar with the tools below will substantially ease your contribution experience.

- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

## Dependencies

Mock Service Worker depends on multiple other libraries.

| Library name                                            | Purpose                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| [cookies](https://github.com/mswjs/cookies)             | Enables cookies persistence and inference between environments.          |
| [headers-utils](https://github.com/mswjs/headers-utils) | `Headers` polyfill to manage request/response headers.                   |
| [interceptors](https://github.com/mswjs/interceptors)   | Provisions request interception in Node.js (internals of `setupServer`). |

There are cases when an issue originates from one of the said dependencies. Don't hesitate to address it in the respective repository, as they all are governed by the same team.

## Getting started

### Fork the repository

Please use the GitHub UI to [fork this repository](https://github.com/mswjs/msw) (_read more about [Forking a repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo)_). Mock Service Worker has forked builds enabled in the CI, so you will see the build status of your fork's branch.

### Install

```bash
$ cd msw
$ pnpm install
$ pnpm dev
```

> Please use [PNPM][pnpm-url] version 8.15 while working on this project.
> Guide on how to install a specific PNPM version can be [found here][pnpm-install-guide-url].

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

## Build

Build the library with the following command:

```bash
$ pnpm build
```

## Tests

All tests are run with [Vitest](https://vitest.dev/). Build the library and install the browser once, then run the tests:

```bash
$ pnpm build
$ pnpm exec playwright install chromium
$ pnpm test
```

> The tests run against the built library. Keep the build running (`pnpm dev`) while working on the tests.

Provide a file path to run a single test:

```bash
$ pnpm test src/utils/multiply.test.ts
$ pnpm test test/protocols/http/example.test.ts
```

**Always begin your implementation from tests**. When tackling an issue, a test for it must be missing, or is incomplete. When working on a feature, starting with a test allows you to model the feature's usage before diving into implementation.

### Unit tests

Unit tests cover small independent functions and are placed next to the tested code.

```ts
// src/utils/multiply.test.ts
import { multiply } from './multiply'

test('multiplies two given numbers', () => {
  expect(multiply(2, 3)).toEqual(6)
})
```

> Please [avoid nesting](https://kentcdodds.com/blog/avoid-nesting-when-youre-testing/) while you're testing.

### Integration tests

Integration tests live under `./test`. We follow an example-driven testing paradigm, meaning that each integration test represents a _usage example_.

The same test runs in both Node.js and the browser ([Vitest Browser Mode](https://vitest.dev/guide/browser/)). The file name decides where the test runs:

| File name           | Environment                                                    |
| ------------------- | -------------------------------------------------------------- |
| `*.test.ts`         | Node.js and browser.                                           |
| `*.node.test.ts`    | Node.js only.                                                  |
| `*.browser.test.ts` | Browser only.                                                  |
| `*.pw.test.ts`      | Playwright (full-page lifecycle, multi-tab). Run separately\*. |

> \*Playwright tests are the only exception to `pnpm test`. Run them with `pnpm test:playwright`.

Define the initial request handlers with `defineTestNetwork()`. It returns the `test` function that sets up `setupServer()` or `setupWorker()` depending on the environment, and exposes it as the `network` fixture.

```ts
// test/protocols/http/example.test.ts
import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://example.com/books', () => {
    return HttpResponse.json([
      {
        id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
        title: 'The Lord of the Rings',
        publishedAt: -486867600,
      },
    ])
  }),
]

const test = defineTestNetwork({ handlers })

test('returns a mocked response', async ({ fetch }) => {
  const response = await fetch('https://example.com/books')

  await expect(response.json()).resolves.toEqual([
    {
      id: 'ea42ffcb-e729-4dd5-bfac-7a5b645cb1da',
      title: 'The Lord of the Rings',
      publishedAt: -486867600,
    },
  ])
})
```

[pnpm-url]: https://pnpm.io/
[pnpm-install-guide-url]: https://pnpm.io/8.x/installation#installing-a-specific-version
