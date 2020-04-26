import { Socket } from 'net'
import { ClientRequest, ClientRequestArgs, IncomingMessage } from 'http'
import { getResponse } from '../../utils/getResponse'
import { RequestHandler, MockedRequest } from '../../handlers/requestHandler'

function createMockedRequestFromClientRequest(
  input: string | URL | ClientRequestArgs,
): MockedRequest {
  const req = input as ClientRequestArgs & URL

  return {
    url: req.href,
    method: req.method || 'GET',
    headers: null as any,
    mode: null as any,
    keepalive: null as any,
    cache: null as any,
    destination: null as any,
    integrity: null as any,
    credentials: null as any,
    redirect: null as any,
    referrer: null as any,
    referrerPolicy: null as any,
    body: null as any,
    bodyUsed: null as any,
    query: null as any,
    params: null as any,
  }
}

export class HttpClientRequestOverride extends ClientRequest {
  response: IncomingMessage
  handlers: RequestHandler[]
  mockedRequest: MockedRequest

  constructor(
    input: string | URL | ClientRequestArgs,
    handlers: RequestHandler[],
  ) {
    super(input)

    this.handlers = handlers
    this.mockedRequest = createMockedRequestFromClientRequest(input)

    const socket = new Socket()
    this.response = new IncomingMessage(socket)
  }

  async end() {
    const { response: mockedResponse } = await getResponse(
      this.mockedRequest,
      this.handlers,
    )

    if (mockedResponse) {
      this.response.statusCode = mockedResponse.status
      this.response.push(Buffer.from(mockedResponse.body))
    }

    // Mark request as finished
    this.finished = true
    this.emit('finish')
    this.emit('response', this.response)

    // End the response
    this.response.push(null)
    this.response.complete = true
  }
}
