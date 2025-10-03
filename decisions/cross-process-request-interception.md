# Cross-Process Request Interception (CPRI)

## Goal

Allow the user to intercept the network from one process while handling it in another. The primary use case for this is to affect the server-side application requests while within the test process:

```ts
// app.js
import { setupServer } from 'msw/node'

// Establish the sender
const server = setupServer({
  remote: { enable: true },
})
server.listen()
```

```ts
// test/homepage.test.ts
// Establish a receiver.
const server = setupRemoteServer()

test('...', async () => {
  server.use(
    http.get('https://example.com/resource', () => {
      return HttpResponse.text('hello world')
    }),
  )
})
```

## Sender and receiver

The remote interception consists of two parts:

- The sender that intercepts the traffic in a remote process and sends it to the receiver to potentially handle;
- The receiver that resolves any received requests against the defined request handlers.

> I chose to emphasize the receiver part with `setupRemoteServer()` to highlight that this "server" is not going to intercept the traffic in this process, unlike `setupServer()`.

## Protocol

For such an interception to be possible, we are designing a network serialization protocol to transfer requests and responses between processes. Spiritually, this isn't much different from the serialization we already perform between the client and worker threads in `setupWorker`.

I propose we use WebSocket as the underlying transport for this protocol. This will support HTTP requests while give us a proper protocol to serialize and handle WebSocket requests as well, since those will be event-based by design (something that won't be possible to properly describe with HTTP). WebSocket does pose a slight challenge as we would have to handle request body streams properly (can we use `WebSocketStream` for that?).

> I am open to considering other protocols, too. We might benefit even more from a custom RPC, like the one in [Cap'n Web](https://github.com/cloudflare/capnweb). May be worth looking into it for inspiration.

## `RemoteRequestHandler`

We use a new kind of request handler called `RemoteRequestHandler` on the _sender_ part to stall the request resolution until the receiver decides on how to handle the outgoing request. If the receiver does not handle the request, the sender proceeds with using its own request handlers for request resolution.

> `RemoteRequestHandler` is not the best mechanism for this. While it works with the current layout of MSW, the sender process is de-facto a _source_ of network. I like the concept of [network sources](https://github.com/mswjs/msw/discussions/2488) but it's a large refactor that we should not include in the remote interception right now. What we should do, is design the current approach so it's ready for network sources as much as possible.

## Pending tasks

- [ ] **Outline the network serialization protocol**. How to represent requests/responses? Their body streams? (see prior work at `src/core/nhp`). How to handle binary data transferred via WebSocket? The protocol should be able to serialize and deserialize all of that.
- [ ] (Potentially) replace the current serialization logic in `setupWorker` with the designed protocol to stay consistent.
- [ ] Tackle common use case problems:
  - [ ] What if the app needs the test to serve homepage (see [this](https://github.com/mswjs/msw/pull/1617#issuecomment-2331258739))? That creates a catch 22 since testing frameworks often wait for the app to respond so they know the app is ready for tests. If the app's response depends on the test now, they both will get stuck indefinitely.
- [ ] Fix the [life-cycle events order](https://github.com/mswjs/msw/pull/1617#issuecomment-2580999914).
- [ ] Ensure the WebSocket transport is secure (see [this](https://github.com/mswjs/msw/pull/1617#pullrequestreview-2937795837)).
- [ ] Add more tests for HTTP and WebSocket CPRI.
