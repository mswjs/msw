export interface LoggedRequest {
  url: URL
  method: string
  headers: Record<string, string>
  body: string
}

/**
 * Formats a mocked request for introspection in browser's console.
 */
export async function serializeRequest(
  request: Request,
): Promise<LoggedRequest> {
  return {
    url: new URL(request.url),
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
  }
}
