export const REQUEST_INTENTION_HEADER_NAME = 'x-msw-intention'

export enum RequestIntention {
  bypass = 'bypass',
  passthrough = 'passthrough',
}

export function shouldBypassRequest(request: Request): boolean {
  return (
    request.headers.get(REQUEST_INTENTION_HEADER_NAME) ===
    RequestIntention.bypass
  )
}

export function shouldPassthroughRequest(response: Response): boolean {
  return (
    response.status === 302 &&
    response.headers.get(REQUEST_INTENTION_HEADER_NAME) ===
      RequestIntention.passthrough
  )
}
