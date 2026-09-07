# Integration tests

This directory contains integration tests for Mock Service Worker.

This directory categorizes all test suites based on the library's execution or API domain:

- `/protocols/http`, tests for HTTP mocking.
- `/protocols/graphql`, tests for GraphQL mocking.
- `/protocols/websocket`, tests for WebSocket mocking.
- `/protocols/sse`, tests for Server-Sent Events mocking.
- `/msw-api`, tests for the library's API.

## Test structure

- `*.test.ts` runs in Node.js and Vitest Browser Mode.
- `*.node.test.ts` runs only in Node.js.
- `*.browser.test.ts` runs only in Vitest Browser Mode.
- `*.pw.test.ts` uses Playwright for full-page lifecycle or multi-tab behavior.

Define initial handlers with `defineNetwork({ handlers })`. Each test receives the
actual `setupServer()` or `setupWorker()` instance as the `network` fixture.

## Contributing

Please see the [Contribution guidelines](/CONTRIBUTING.md) for the instructions on how to run and add new tests. Thank you.
