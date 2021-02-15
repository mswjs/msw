# Integration tests

This directory contains a list of integration tests for the Mock Service Worker library. Our integration tests are example-driven, meaning that each test features a specific usage example and asserts its behavior. We use the [`page-with`](https://github.com/kettanaito/page-with) package to compile and run a usage example within an automated browser environment.

This directory categorizes all test suites based on the library's execution or API domain:

- `/rest-api`, tests for RESTful API mocking.
- `/graphql-api`, rests for GraphQL API mocking.
- `/msw-api`, tests for the library's API.

## Test structure

Example-driven test consists of two parts:

- `*.mocks.ts`, a usage example and also a code snippet to test.
- `*.test.ts`, an actual test suite for Jest.

## Contributing

Please see the [Contribution guidelines](../.github/CONTRIBUTING.md) for the instructions on how to run and add new tests. Thank you.
