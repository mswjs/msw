# Integration tests

This directory contains a list of integration tests for the Mock Service Worker library. An integration test usually runs in a browser (via Puppeteer + WDS), allowing us to target and assert the actual library's behavior in a developer's browser.

This directory categorizes all test suites based on the library's execution or API domain:

- `/rest-api`, `/graphql-api`: for tests concerning the usage of the library with the respective API type.
- `/msw-api` for the tests concerning the library's API.

> There is also the `/support` directory that contains the modules necessary for the tests to run, such as webpack configuration and Puppeteer setup files.

## Test structure

Each test consists of two parts:

- `*.mocks.ts`, a usage example and also a code snippet to test.
- `*.test.ts`, an actual test suite for Jest.

## Contributing

Please see the [Contribution guidelines](../.github/CONTRIBUTING.md) for the instructions on how to run and add new tests. Thank you.
