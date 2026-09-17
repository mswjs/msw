import type {} from '@vitest/browser-playwright'
import { defineNetwork as defineBaseNetwork, expect } from './vitest'

type ConsoleMessageType =
  | 'debug'
  | 'endGroup'
  | 'error'
  | 'info'
  | 'log'
  | 'startGroup'
  | 'startGroupCollapsed'
  | 'warning'

export class ConsoleMessages extends Map<ConsoleMessageType, Array<string>> {
  readonly raw = new Map<ConsoleMessageType, Array<string>>()

  get(key: 'raw'): Map<ConsoleMessageType, Array<string>>
  get(key: ConsoleMessageType): Array<string> | undefined
  get(
    key: ConsoleMessageType | 'raw',
  ): Array<string> | Map<ConsoleMessageType, Array<string>> | undefined {
    if (key === 'raw') {
      return this.raw
    }

    return super.get(key)
  }

  clear(): void {
    super.clear()
    this.raw.clear()
  }
}

interface GraphQLQueryOptions {
  method?: 'GET' | 'POST'
  query: string
  variables?: Record<string, unknown>
  multipartOptions?: {
    map: Record<string, Array<string>>
    fileContents: Array<string>
  }
}

interface BrowserRequest {
  headers(): Record<string, string>
  url(): string
}

interface CapturedResponse {
  mocked: boolean
  request: Request
  response: Response
}

interface FetchOptions {
  captureResponse?: boolean
  waitForResponse?(response: BrowserResponse): boolean | Promise<boolean>
}

class BrowserResponse {
  readonly #response: Response
  readonly #request: BrowserRequest
  readonly #mocked: boolean
  readonly #fromServiceWorker: boolean

  constructor(
    response: Response,
    requestUrl: string,
    requestHeaders: Headers,
    mocked: boolean,
    fromServiceWorker = mocked,
  ) {
    this.#response = response
    this.#mocked = mocked
    this.#fromServiceWorker = fromServiceWorker
    this.#request = {
      headers() {
        return Object.fromEntries(requestHeaders)
      },
      url() {
        return requestUrl
      },
    }
  }

  allHeaders(): Promise<Record<string, string>> {
    return Promise.resolve(Object.fromEntries(this.#response.headers))
  }

  async body(): Promise<Uint8Array> {
    return new Uint8Array(await this.#response.clone().arrayBuffer())
  }

  fromServiceWorker(): boolean {
    return this.#fromServiceWorker
  }

  headers(): Record<string, string> {
    return Object.fromEntries(this.#response.headers)
  }

  isMocked(): boolean {
    return this.#mocked
  }

  headerValue(name: string): Promise<string | null> {
    return Promise.resolve(this.#response.headers.get(name))
  }

  json(): Promise<unknown> {
    return this.#response.clone().json()
  }

  request(): BrowserRequest {
    return this.#request
  }

  status(): number {
    return this.#response.status
  }

  statusText(): string {
    return this.#response.statusText
  }

  text(): Promise<string> {
    return this.#response.clone().text()
  }

  url(): string {
    return this.#response.url || this.#request.url()
  }
}

function formatConsoleMessage(values: Array<unknown>): string {
  return values
    .map((value) => {
      if (typeof value === 'string') {
        return value
      }

      if (value instanceof Error) {
        return value.message
      }

      return JSON.stringify(value)
    })
    .join(' ')
    .replace(/\(*(%s|%c|color:\S+)\)*\s*/g, '')
    .trim()
}

function createConsoleSpy(): ConsoleMessages {
  const messages = new ConsoleMessages()
  const methods = [
    ['debug', 'debug'],
    ['error', 'error'],
    ['group', 'startGroup'],
    ['groupCollapsed', 'startGroupCollapsed'],
    ['groupEnd', 'endGroup'],
    ['info', 'info'],
    ['log', 'log'],
    ['warn', 'warning'],
  ] as const

  for (const [methodName, messageType] of methods) {
    const originalMethod = console[methodName]
    console[methodName] = (...values: Array<unknown>) => {
      const previousMessages = messages.get(messageType) ?? []
      const previousRawMessages = messages.raw.get(messageType) ?? []
      messages.set(messageType, [
        ...previousMessages,
        formatConsoleMessage(values),
      ])
      messages.raw.set(messageType, [
        ...previousRawMessages,
        values.map(String).join(' '),
      ])
      originalMethod(...values)
    }
  }

  return messages
}

async function evaluate<Result, Argument = never>(
  baseUrl: string,
  callback: (() => Result) | ((argument: Argument) => Result),
  ...argumentsList: [] | [Argument]
): Promise<Awaited<Result>> {
  if (typeof window !== 'undefined') {
    return Reflect.apply(callback, globalThis, argumentsList)
  }

  const interceptedFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    const resolvedInput =
      typeof input === 'string' || input instanceof URL
        ? new URL(input, baseUrl)
        : input
    return interceptedFetch(resolvedInput, init)
  }

  try {
    return await Reflect.apply(callback, globalThis, argumentsList)
  } finally {
    globalThis.fetch = interceptedFetch
  }
}

export function defineNetwork(
  definition: import('./network').NetworkDefinition = {},
) {
  const test = defineBaseNetwork(definition)
    .extend('page', async ({ network, testServer }, { onCleanup }) => {
      const capturedResponses: Array<CapturedResponse> = []
      const cleanupCallbacks: Array<() => void> = []
      const captureMockedResponse = ({
        request,
        response,
      }: {
        request: Request
        response: Response
      }) => {
        capturedResponses.push({ mocked: true, request, response })
      }
      const captureBypassedResponse = ({
        request,
        response,
      }: {
        request: Request
        response: Response
      }) => {
        capturedResponses.push({ mocked: false, request, response })
      }

      network.events.on('response:mocked', captureMockedResponse)
      network.events.on('response:bypass', captureBypassedResponse)
      cleanupCallbacks.push(() => {
        network.events.removeListener('response:mocked', captureMockedResponse)
        network.events.removeListener(
          'response:bypass',
          captureBypassedResponse,
        )
      })
      onCleanup(() => {
        for (const cleanupCallback of cleanupCallbacks) {
          cleanupCallback()
        }
      })

      const findResponse = async (
        matcher:
          | string
          | RegExp
          | ((response: BrowserResponse) => boolean | Promise<boolean>),
      ): Promise<BrowserResponse | undefined> => {
        for (const capturedResponse of capturedResponses) {
          const response = new BrowserResponse(
            capturedResponse.response.clone(),
            capturedResponse.request.url,
            capturedResponse.request.headers,
            capturedResponse.mocked,
            true,
          )
          const matches =
            typeof matcher === 'string'
              ? response.url() === matcher
              : matcher instanceof RegExp
                ? matcher.test(response.url())
                : await matcher(response)

          if (matches) {
            return response
          }
        }
      }

      return {
        evaluate<Result, Argument = never>(
          callback: (() => Result) | ((argument: Argument) => Result),
          ...argumentsList: [] | [Argument]
        ): Promise<Awaited<Result>> {
          return evaluate(testServer.http.href, callback, ...argumentsList)
        },
        async evaluateHandle<Result>(callback: () => Result): Promise<Result> {
          return callback()
        },
        exposeFunction<Callback extends (...args: Array<never>) => unknown>(
          name: string,
          callback: Callback,
        ) {
          Object.assign(globalThis, { [name]: callback })
        },
        on(eventName: 'pageerror', listener: (error: Error) => void) {
          if (typeof window === 'undefined') {
            return
          }

          const handleError = (event: ErrorEvent) => {
            listener(event.error ?? new Error(event.message))
          }

          window.addEventListener('error', handleError)
          cleanupCallbacks.push(() => {
            window.removeEventListener('error', handleError)
          })
        },
        url() {
          return typeof location === 'undefined'
            ? testServer.http.href
            : location.href
        },
        async waitForRequest(matcher: string | URL): Promise<BrowserRequest> {
          const requestUrl = matcher.toString()
          let request: Request | undefined

          await expect
            .poll(() => {
              request = capturedResponses.find((entry) => {
                return entry.request.url === requestUrl
              })?.request
              return request
            })
            .toBeDefined()

          return {
            headers() {
              return Object.fromEntries(request?.headers ?? [])
            },
            url() {
              return requestUrl
            },
          }
        },
        async waitForResponse(
          matcher:
            | string
            | RegExp
            | ((response: BrowserResponse) => boolean | Promise<boolean>),
        ): Promise<BrowserResponse> {
          let response: BrowserResponse | undefined

          await expect
            .poll(async () => {
              response = await findResponse(matcher)
              return response
            })
            .toBeDefined()

          if (!response) {
            throw new Error('Failed to resolve the expected response')
          }

          return response
        },
        waitForFunction<Result>(callback: () => Result): Promise<Result> {
          return expect
            .poll(callback)
            .toBeTruthy()
            .then(() => callback())
        },
        waitForTimeout(duration: number): Promise<void> {
          return new Promise((resolve) => {
            setTimeout(resolve, duration)
          })
        },
      }
    })
    .extend('fetch', async ({ network, testServer }) => {
      return async (
        input: string | URL,
        init: RequestInit = {},
        options: FetchOptions = {},
      ): Promise<BrowserResponse> => {
        const baseUrl =
          typeof location === 'undefined' ? testServer.http.href : location.href
        const requestUrl = new URL(input, baseUrl).href
        const requestId = crypto.randomUUID()
        const requestHeaders = new Headers(init.headers)
        requestHeaders.set('accept-language', requestId)
        const resolvedInit: RequestInit = {
          ...init,
          headers: requestHeaders,
        }
        const capturedResponses: Array<CapturedResponse> = []
        let responseCaptured = Promise.withResolvers<void>()
        const notifyResponseCaptured = () => {
          responseCaptured.resolve()
          responseCaptured = Promise.withResolvers<void>()
        }
        const markMockedResponse = ({
          request,
          response,
        }: {
          request: Request
          response: Response
        }) => {
          if (request.headers.get('accept-language') === requestId) {
            capturedResponses.push({ mocked: true, request, response })
            notifyResponseCaptured()
          }
        }
        const markBypassedResponse = ({
          request,
          response,
        }: {
          request: Request
          response: Response
        }) => {
          if (request.headers.get('accept-language') === requestId) {
            capturedResponses.push({ mocked: false, request, response })
            notifyResponseCaptured()
          }
        }

        network.events.on('response:mocked', markMockedResponse)
        network.events.on('response:bypass', markBypassedResponse)
        const response = await globalThis.fetch(requestUrl, resolvedInit)

        if (options.captureResponse === false) {
          network.events.removeListener('response:mocked', markMockedResponse)
          network.events.removeListener('response:bypass', markBypassedResponse)
          return new BrowserResponse(
            response,
            requestUrl,
            requestHeaders,
            false,
          )
        }

        while (true) {
          const nextResponseCaptured = responseCaptured.promise
          const browserResponses = capturedResponses.map((capturedResponse) => {
            return new BrowserResponse(
              capturedResponse.response,
              capturedResponse.request.url,
              capturedResponse.request.headers,
              capturedResponse.mocked,
              true,
            )
          })

          for (const browserResponse of browserResponses) {
            const isExpectedResponse = options.waitForResponse
              ? await options.waitForResponse(browserResponse)
              : browserResponse.isMocked() ||
                !browserResponse
                  .request()
                  .headers()
                  .accept?.includes('msw/passthrough')

            if (isExpectedResponse) {
              network.events.removeListener(
                'response:mocked',
                markMockedResponse,
              )
              network.events.removeListener(
                'response:bypass',
                markBypassedResponse,
              )
              return browserResponse
            }
          }

          await nextResponseCaptured
        }
      }
    })
    .extend('makeUrl', ({ testServer }) => {
      return (pathname: string): string => {
        const baseUrl =
          typeof location === 'undefined' ? testServer.http.href : location.href
        return new URL(pathname, baseUrl).href
      }
    })
    .extend('query', async ({ fetch, testServer }) => {
      return (uri: string | URL, options: GraphQLQueryOptions) => {
        const method = options.method ?? 'POST'
        const baseUrl =
          typeof location === 'undefined' ? testServer.http.href : location.href
        const requestUrl = new URL(uri, baseUrl)
        const headers = new Headers()
        let body: FormData | string | undefined

        if (method === 'GET') {
          requestUrl.searchParams.set('query', options.query)

          if (options.variables) {
            requestUrl.searchParams.set(
              'variables',
              JSON.stringify(options.variables),
            )
          }
        } else if (options.multipartOptions) {
          const multipartBody = new FormData()
          multipartBody.set(
            'operations',
            JSON.stringify({
              query: options.query,
              variables: options.variables,
            }),
          )
          multipartBody.set('map', JSON.stringify(options.multipartOptions.map))
          options.multipartOptions.fileContents.forEach(
            (fileContent, index) => {
              multipartBody.append(
                index.toString(),
                new File([fileContent], `file${index}.txt`),
              )
            },
          )
          body = multipartBody
        } else {
          headers.set('content-type', 'application/json')
          body = JSON.stringify({
            query: options.query,
            variables: options.variables,
          })
        }

        return fetch(requestUrl, { method, headers, body })
      }
    })
    .extend('spyOnConsole', { scope: 'file' }, () => {
      const messages = createConsoleSpy()
      return () => {
        messages.clear()
        return messages
      }
    })

  test.beforeEach(async () => {
    if (typeof window === 'undefined') {
      return
    }

    const { cdp } = await import('vitest/browser')
    await cdp().send('Network.clearBrowserCookies')
    localStorage.clear()
    sessionStorage.clear()
  })

  return test
}

const test = defineNetwork()

export { expect, test }
