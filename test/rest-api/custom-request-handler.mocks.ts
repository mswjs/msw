import {
  RequestHandler,
  ResponseResolver,
  ResponseTransformer,
  MockedRequest,
  context,
  compose,
  setupWorker,
} from 'msw'

// This is an example of a custom request handler that matches requests
// based on the presence of a given header.
class HeaderHandler extends RequestHandler<{
  header: string
  headerName: string
}> {
  constructor(headerName: string, resolver: ResponseResolver) {
    super({
      info: {
        header: `HeaderHandler "${headerName}"`,
        headerName,
      },
      resolver,
    })
  }

  // Predicate is a function that must resolve to true or false,
  // stating whether a captured request should be mocked.
  predicate(req: MockedRequest) {
    return req.headers.has(this.info.headerName)
  }

  log(req: MockedRequest) {
    console.log(`${req.method} ${req.url.toString()}`)
  }
}

interface CustomContext {
  halJson: (body: Record<string, any>) => ResponseTransformer
}

class UrlHandler extends RequestHandler<{ header: string; url: string }> {
  constructor(
    url: string,
    resolver: ResponseResolver<MockedRequest, CustomContext>,
  ) {
    super({
      info: {
        header: '/',
        url,
      },
      ctx: {
        halJson(body) {
          return compose(
            context.set('Content-Type', 'application/hal+json'),
            context.body(JSON.stringify(body)),
          )
        },
      },
      resolver,
    })
  }

  predicate(req: MockedRequest) {
    return req.url.href.includes(this.info.url)
  }

  log(req: MockedRequest) {
    console.log(`${req.method} ${req.url.toString()}`)
  }
}

const worker = setupWorker(
  new HeaderHandler('x-custom-header', (req, res, ctx) => {
    return res(
      ctx.status(401),
      context.json({
        error: 'Hey, this is a mocked error',
      }),
    )
  }),

  new UrlHandler('https://test.url', (req, res, ctx) => {
    return res(
      ctx.halJson({
        age: 42,
        firstName: 'John',
      }),
    )
  }),
)

worker.start()
