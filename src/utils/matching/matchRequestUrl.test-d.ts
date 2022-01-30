import { matchRequestUrl } from './matchRequestUrl'

const url = new URL('')

// Path parameter type is inferred from the path string.
matchRequestUrl(url, '/user/:id').params.id.trim()

// @ts-expect-error Property "foo" doesn't exist in path params.
matchRequestUrl(url, '/user/:id').params.foo

// Multiple occurrences of the same path parameter
// are inferred as a readonly array of strings.
matchRequestUrl(url, '/:a/chunk/:a').params.a.map
