import { MockedRequest } from './handlers/requestHandler'
import { fetch } from '../context/fetch'

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
  private logs: RecordRequest[]
  constructor() {
    this._isRecording = false
    this.logs = []
  }

  record() {
    if (this._isRecording) {
      return
    }
    this._isRecording = true
    this.logs = []
  }

  isRecording() {
    return this._isRecording
  }

  async _handleRequest(request: MockedRequest) {
    const response = await fetch(request)

    const log = await createRecordFromRequest(request, response)
    this.logs.push(log)
    return response
  }

  getLogs() {
    return this.logs
  }

  stop() {
    this._isRecording = false
    return this.logs
  }
}

export { Recorder }
