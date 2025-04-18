export const REQUEST_INTENTION_HEADER_NAME = 'x-msw-intention'

export enum RequestIntention {
  passthrough = 'passthrough',
}

export function shouldBypassRequest(request: Request): boolean {
  return !!request.headers.get('accept')?.includes('msw/passthrough')
}

export function isPassthroughResponse(response: Response): boolean {
  return (
    response.status === 302 &&
    response.headers.get(REQUEST_INTENTION_HEADER_NAME) ===
      RequestIntention.passthrough
  )
}
