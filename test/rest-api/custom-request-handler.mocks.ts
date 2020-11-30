import {
  setupWorker,
  ResponseResolver,
  RequestHandler,
  ResponseTransformer,
  context,
  MockedRequest,
  compose,
} from 'msw'
import { ResponseWithSerializedHeaders } from 'msw/lib/types/setupWorker/glossary'

const defaultLogger = (
  req: MockedRequest,
  res: ResponseWithSerializedHeaders,
) => {
  console.log('%s %s', req.method, req.url.href)
  console.log('response:', res)
}

// This is an example of a custom request handler that matches requests
// based on the presence of a given header.
const withHeader = (
  headerName: string,
  resolver: ResponseResolver,
): RequestHandler => {
  return {
    // Predicate is a function that must resolve to true or false,
    // stating whether a request should be mocked
    predicate(req) {
      return req.headers.has(headerName)
    },
    // Response resolver is a function that returns the mocked response.
    // You usually want this to be dynamic, so it's accepted via arguments.
    resolver,
    log: defaultLogger,
    // Without a custom `defineContext` property this request handler
    // can operate with all common context utilities: set, status, fetch, delay.
  }
}

interface CustomContext {
  halJson: (body: Record<string, any>) => ResponseTransformer
}

const withUrl = (
  url: string,
  resolver: ResponseResolver<MockedRequest, CustomContext>,
): RequestHandler<MockedRequest, CustomContext> => {
  return {
    predicate(req) {
      return req.url.href.includes(url)
    },
    resolver,
    defineContext() {
      return {
        halJson(body) {
          return compose(
            context.set('Content-Type', 'application/hal+json'),
            context.body(JSON.stringify(body)),
          )
        },
      }
    },
    log: defaultLogger,
  }
}

const worker = setupWorker(
  withHeader('x-custom-header', (req, res, ctx) => {
    return res(
      ctx.status(401),
      context.json({
        error: 'Hey, this is a mocked error',
      }),
    )
  }),

  withUrl('https://test.url', (req, res, ctx) => {
    return res(
      ctx.halJson({
        age: 42,
        firstName: 'John',
      }),
    )
  }),
)

worker.start()
