import {
  SerializedResponse,
  serializeResponse,
} from '../request/serializeUtils'

export interface LoggableResponseObject
  extends Omit<SerializedResponse, 'body'> {
  body: string
}

const textDecoder = new TextDecoder()

export async function responseToLoggableObject(
  response: Response,
): Promise<LoggableResponseObject> {
  const serializedResponse = await serializeResponse(response)
  const responseText = textDecoder.decode(serializedResponse.body)

  return {
    ...serializedResponse,
    body: responseText,
  }
}
