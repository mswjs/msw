# msw single file concurrency failing 

### Goal 
Create a test suite to reliably show tests involving msw failing when executed in parallel.

###  Method
- Create a shared server to be consumed by two seperate tests
- Define tests within one describe block with `it.concurrent()`
  - Using serial execution via `it()` syntax will make the tests pass.
  - `beforeAll()` is not officially supported with `.concurrent()` syntax so I use [this method](https://github.com/facebook/jest/issues/7997#issuecomment-796965078) to ensure `beforeAll()` is triggered before tests are run.
- use `async await sleep` to ensure operations upon the server happen in the precise order despite being in different tests.
- Assert that a request made in _test suite A_ is erroneously handled by a handler attached in _test suite B_.
-  Use a request param to distinguish between requests from both test suites `one` and `two`.

## Expected logs, if msw supported concurrency:

- `step 1 - process one attach handler to server`
- `step 2 - process two attach handler to server`
- `step 3 - process one make request`
- `step 4 - process one handler resolver triggered`
- `step 5 - process two make request`
- `step 6 - process two handler resolver triggered`


## Actual Logs

- `step 1 - process one attach handler to server`
- `step 2 - process two attach handler to server`
- `step 3 - process one make request`

  - **this is where it goes wrong**
- `step 6 - process two handler resolver triggered`
- `step 5 - process two make request`
- `step 6 - process two handler resolver triggered`


**Explanation:** 
- Process two was the most recent place where a dynamic handler was added to the server via `server.use()`. 
- Therefor all requests are routed to that implementation since it is at the front of the list of handlers.
- Two handlers are attached at this time, however only the newest one gets all of the API requests.




## Observations

Response to @kettanaito proposal [here](https://github.com/mswjs/msw/issues/474#issuecomment-1072567085) 

> Similar to requests identity, I propose to add moduleId/modulePath only to runtime handlers (those defined via server.use()). As long as the request and the runtime handler share the moduleId, it guarantees that they were issued/prepended in the same module and can affect each other.


Supporting parallization of testing within one file, in addition to by `moduleId` could be something worth striving towards.


## Runtime handler identity

I noticed the `callFrame` property from within `handler.info` exposes not only the module, but also the exact line number from which it was called. 

Add a `lineNumber` to the identity of requests and handlers.

1. Use `moduleId/modulePath` to narrow down the list of possibly valid runtime handlers to this module.
2. When more than one remains:
  a. find the one that has the closest line number **BEFORE** the `lineNumber` within the request.

```typescript 
{
  id: "uuid-of-request",
  modulePath: "/User/octocat/GitHub/test/Profile.test.tsx"
  lineNumber: 337
}
```
