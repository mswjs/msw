import { DefaultMultipartBodyType } from '../handlers/requestHandler'

function parseContentHeaders(
  headersString: string,
): { name: string; filename?: string; contentType: string } {
  const headers = new Headers(
    headersString.split('\r\n').map((s) => {
      const [name, ...rest] = s.split(': ')
      return [name, rest.join(': ')]
    }),
  )
  const contentType = headers.get('content-type') ?? 'text/plain'
  const disposition = headers.get('content-disposition')
  if (!disposition) {
    throw new Error('"Content-Disposition" header is required.')
  }
  const directives: Record<string, string | undefined> = {}
  disposition.split(';').map((s) => {
    const [name, ...rest] = s.trim().split('=')
    directives[name] = rest.join('=')
  })
  const { name: _name = '', filename: _filename } = directives
  const name = _name.slice(1, -1)
  const filename = _filename === undefined ? undefined : _filename.slice(1, -1)
  return { name, filename, contentType }
}

/**
 * Parses a given string as a multipart/form-data.
 * Does not throw an exception on an invalid multipart string.
 */
export function multipartParse<T extends DefaultMultipartBodyType>(
  str: string,
  headers?: Headers,
): T | undefined {
  const contentType = headers?.get('content-type')
  if (!contentType) {
    return undefined
  }
  const [, ...directives] = contentType.split('; ')
  const boundary = directives
    .filter((d) => d.startsWith('boundary='))
    .map((s) => s.replace(/^boundary=/, ''))[0]
  if (!boundary) {
    return undefined
  }
  const boundaryRegExp = new RegExp(`--+${boundary}`)
  const fields = str
    .split(boundaryRegExp)
    .filter((s) => s.startsWith('\r\n') && s.endsWith('\r\n'))
    .map((s) => s.trimStart().replace(/\r\n$/, ''))
  if (!fields.length) {
    return undefined
  }
  const parsedBody: DefaultMultipartBodyType = {}

  try {
    for (const field of fields) {
      const [contentHeaders, ...rest] = field.split('\r\n\r\n')
      const contentBody = rest.join('\r\n\r\n')
      const { contentType, filename, name } = parseContentHeaders(
        contentHeaders,
      )
      const value =
        filename === undefined
          ? contentBody
          : new File([contentBody], filename, { type: contentType })
      const parsedValue = parsedBody[name]
      if (parsedValue === undefined) {
        parsedBody[name] = value
      } else if (Array.isArray(parsedValue)) {
        parsedBody[name] = [...parsedValue, value]
      } else {
        parsedBody[name] = [parsedValue, value]
      }
    }
    return parsedBody as T
  } catch (error) {
    return undefined
  }
}
