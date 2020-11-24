import { MockedRequest } from './handlers/requestHandler'
import { fetch } from '../context/fetch'
import { SetupApi, RequestHandlersList } from '../setupWorker/glossary'
import { rest, restContext } from '../rest'
import { ResponseComposition } from '../response'

type RecordRequest = {
  function: string
  returnStatement: string
  method: Request['method']
  url: URL
}

async function createRecordFromRequest(
  request: MockedRequest,
  response: Response,
): Promise<RecordRequest> {
  const lines = []
  const composeLines = []
  lines.push(
    `rest.${request.method.toLowerCase()}('${
      request.url
    }',function(req,res,ctx){`,
  )

  composeLines.push(`ctx.status(${response.status})`)
  const body = await response.text()

  if (body) {
    const hasJsonContent = response.headers
      ?.get('content-type')
      ?.includes('json')
    if (hasJsonContent) {
      composeLines.push(`ctx.json(${body})`)
    } else {
      composeLines.push(`ctx.body(\`${body.replace(/`/g, '\\`')}\`)`)
    }
  }

  response.headers.forEach((value, key) => {
    composeLines.push(`ctx.set('${key}', \`${value}\`)`)
  })

  lines.push(`return res(
${[...composeLines, `ctx.set('x-recorded-by', 'msw')`].join(',\n')}
  )`)
  lines.push(`})`)
  return {
    function: lines.join('\n'),
    method: request.method.toUpperCase(),
    url: request.url,
    returnStatement: composeLines.join(',\n'),
  }
}

class Recorder {
  private _isRecording: boolean
  private _logs: Omit<RecordRequest, 'returnStatement'>[]
  private _mswInstance?: SetupApi
  private _currentHandlers: RequestHandlersList = []

  constructor(mswInstance?: SetupApi) {
    this._isRecording = false
    this._mswInstance = mswInstance
    this._logs = []
  }

  record() {
    if (!this._mswInstance) {
      throw new Error("We can't record requests without an instance of MSW.")
    }
    if (this._isRecording) {
      return
    }
    // do not remove ctx because it will be used by eval
    const handleRequest = async (
      request: MockedRequest,
      res: ResponseComposition<any>,
      ctx: typeof restContext,
    ) => {
      const response = await fetch(request)
      const log = await createRecordFromRequest(request, response)
      this._logs.push({
        function: log.function,
        method: log.method,
        url: log.url,
      })

      return res(eval(log.returnStatement))
    }

    this._currentHandlers = this._mswInstance.removeAllHandlers()
    this._mswInstance.use(rest.get('*', handleRequest))
    this._mswInstance.use(rest.post('*', handleRequest))
    this._mswInstance.use(rest.head('*', handleRequest))
    this._mswInstance.use(rest.options('*', handleRequest))
    this._mswInstance.use(rest.put('*', handleRequest))
    this._mswInstance.use(rest.delete('*', handleRequest))
    this._isRecording = true
    this._logs = []
  }

  setMSWInstance(mswInstance: SetupApi) {
    this._mswInstance = mswInstance
  }

  isRecording() {
    return this._isRecording
  }

  getLogs() {
    return this._logs
  }

  stop() {
    if (!this._mswInstance) {
      throw new Error("We can't record requests without an instance of MSW.")
    }
    if (this._isRecording) {
      this._mswInstance.removeAllHandlers()
      this._isRecording = false
      this._mswInstance.use(...this._currentHandlers)
    }
    return this._logs
  }
}

export { Recorder }
