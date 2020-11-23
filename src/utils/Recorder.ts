import { MockedRequest } from './handlers/requestHandler'
import { fetch } from '../context/fetch'

async function createFunctionFromRequest(
  request: MockedRequest,
  response: Response,
) {
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
    composeLines.push(`ctx.body(${body})`)
  }

  response.headers.forEach((value, key) => {
    composeLines.push(`ctx.set('${key}', '${value}')`)
  })

  lines.push(`return res(
${composeLines.join(',\n')}
  )`)
  lines.push(`})`)
  return lines.join('\n')
}

class Recorder {
  private isRecording: boolean
  private logs: string[]
  constructor() {
    this.isRecording = false
    this.logs = []
  }

  record() {
    if (this.isRecording) {
      return
    }
    this.isRecording = true
    this.logs = []
  }

  _isRecording() {
    return this.isRecording
  }

  async _handleRequest(request: MockedRequest) {
    console.log(request)
    const response = await fetch(request)

    const log = await createFunctionFromRequest(request, response)

    this.logs.push(log)
    return response
  }

  getLogs() {
    return [...this.logs]
  }

  stop() {
    this.isRecording = false
    return this.logs
  }
}

type ApiRecorder = {
  record: () => void
  getLogs: () => string[]
  stop: () => string[]
}

export { Recorder, ApiRecorder }
