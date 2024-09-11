// @vite-environment node
import { Match, matchRequestUrl } from './matchRequestUrl'

test('does not throw on relative URLs in Node.js', () => {
  expect(matchRequestUrl(new URL('http://localhost'), '/foo')).toEqual<Match>({
    matches: false,
    params: {},
  })

  expect(
    matchRequestUrl(new URL('http://localhost/foo'), '/foo'),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })

  expect(
    matchRequestUrl(new URL('http://localhost/foo'), './foo'),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
})
