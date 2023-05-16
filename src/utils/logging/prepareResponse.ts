import { objectToHeaders } from 'headers-polyfill'
import { SerializedResponse } from '../../setupWorker/glossary'
import { parseBody } from '../request/parseBody'

/**
 * Formats a mocked response for introspection in the browser's console.
 */
export function prepareResponse(res: SerializedResponse<any>) {
  const responseHeaders = objectToHeaders(res.headers)

  // Parse a response JSON body for preview in the logs
  let parsedBody: ReturnType<typeof parseBody> | Promise<any> = parseBody(
    res.body,
    responseHeaders,
  )

  if (parsedBody instanceof ReadableStream) {
    const response = new Response(parsedBody, { headers: responseHeaders })

    const hasJsonContent = (
      responseHeaders?.get('content-type')?.toLowerCase() || ''
    ).includes('json')

    parsedBody = hasJsonContent ? response.json() : response.text()
  }

  return {
    ...res,
    body: parsedBody,
  }
}
