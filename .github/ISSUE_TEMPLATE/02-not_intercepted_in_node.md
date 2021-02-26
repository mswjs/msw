---
name: 'Issue: Node.js interception'
about: My request is not intercepted/mocked in Node.js (tests)
title: ''
labels: bug, scope:node
assignees: ''
---

## Environment

| Name | Version |
| ---- | ------- |
| msw  | 0.0.0   |
| node | XXX     |
| OS   | XXX     |

## Request handlers

<!-- Please provide your mocking setup and the request handlers used -->

```js
// Example of declaration. Provide your code here.
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('???', () => {...})
)

server.listen()
```

## Actual request

<!-- Reference how do you perform a request (i.e. fetch/axios/etc.) -->

```js
// Example of making a request. Provide your code here.
fetch('???').then((res) => res.json())
```

## Current behavior

<!-- Describe what behavior you observe currently -->

## Expected behavior

<!-- Describe what do you expect to happen -->

## Screenshots

<!-- If applicable, attach screenshots to help explain the issue -->
