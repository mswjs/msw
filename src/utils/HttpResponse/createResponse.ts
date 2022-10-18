import type { StrictResponse } from '../../HttpResponse'
import { decorateResponse, type HttpResponseDecoratedInit } from './decorators'

export function createResponse(
  body: BodyInit | null | undefined,
  init: HttpResponseDecoratedInit,
): StrictResponse<any> {
  const response = new Response(body, init)
  decorateResponse(response, init)
  return response as StrictResponse<any>
}
