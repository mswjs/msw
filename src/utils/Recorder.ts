import { MockedRequest } from './handlers/requestHandler'
import { fetch } from '../context/fetch'
import { SetupApi, RequestHandlersList } from '../setupWorker/glossary'
import { rest } from '../rest'

type RecordRequest = {
  function: string
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

  const hasJsonContent = response.headers?.get('content-type')?.includes('json')
  if (hasJsonContent) {
    composeLines.push(`ctx.json(${body})`)
  } else {
    composeLines.push(`ctx.body("${body}")`)
  }

  response.headers.forEach((value, key) => {
    composeLines.push(`ctx.set('${key}', '${value}')`)
  })

  lines.push(`return res(
${composeLines.join(',\n')}
  )`)
  lines.push(`})`)
  return {
    function: lines.join('\n'),
    method: request.method.toUpperCase(),
    url: request.url,
  }
}

class Recorder {
  private _isRecording: boolean
  private _logs: RecordRequest[]
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
    this._currentHandlers = this._mswInstance.removeAllHandlers()
    this._mswInstance.use(rest.get('*', this._handleRequest.bind(this)))
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
      this._isRecording = false
      this._mswInstance.use(...this._currentHandlers)
    }
    return this._logs
  }

  async _handleRequest(request: MockedRequest) {
    console.log('here')
    const response = await fetch(request)

    const log = await createRecordFromRequest(request, response)
    this._logs.push(log)
  }
}

export { Recorder }
