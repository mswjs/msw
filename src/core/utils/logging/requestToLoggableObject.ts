import { SerializedRequest, serializeRequest } from '../request/serializeUtils'

export interface LoggableRequestObject extends Omit<SerializedRequest, 'body'> {
  body: string
}

const textDecoder = new TextDecoder()

/**
 * Formats a mocked request for introspection in browser's console.
 */
export async function requestToLoggableObject(
  request: Request,
): Promise<LoggableRequestObject> {
  const serializedRequest = await serializeRequest(request)
  const requestText = textDecoder.decode(serializedRequest.body)

  return {
    ...serializedRequest,
    body: requestText,
  }
}
