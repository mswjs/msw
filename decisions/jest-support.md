# Jest support

With the introduction of [Mock Service Worker 2.0](https://mswjs.io/blog/introducing-msw-2.0), the library has made a significant step forward in the effort of embracing and promoting web standards. Since that release, its contributors have reported multiple issues with Node.js simply because MSW exposed developers to using standard Node.js APIs.

Betting on the web standards is one of the goals behind this project. One of such standards is ESM. It's the present and the future of JavaScript, and we are planning on switching to ESM-only in the years to come. For that transition to happen, we need to prioritize and, at times, make hard decisions.

**MSW offers no official support for Jest.** It doesn't mean MSW cannot be used in Jest. We maintain usage examples of both [Jest](https://github.com/mswjs/examples/tree/main/examples/with-jest) and [Jest+JSDOM](https://github.com/mswjs/examples/tree/main/examples/with-jest-jsdom) to attest to that. Although it's necessary to mention that those examples require additional setup to tackle underlying Jest or JSDOM issues.

What this means is that **we are not going to address any issues specific to Jest or JSDOM**. Those pose a significant time investment just to uncover another inconsistency between the browser and JSDOM, or the lacking features in Jest, like proper ESM support. That is not a reasonable use of the limited contributors' time. You will have a far better chance of getting your issue solved by reporting it to the Jest or JSDOM repo for the respective teams to address it.

## What's next?

> [!IMPORTANT]
> If you are experiencing issues with using MSW in Jest, **please verify them outside of Jest before reporting them**.

You can verify the issue in a plain Node.js script, or by copying your problematic test to [Vitest](https://vitest.dev/). Please note that we do not support issue reports from non-standard environments, like Deno or Bun either.

You can use one of our existing [Usage examples](https://github.com/mswjs/examples) as a template project to reproduce your issue.
