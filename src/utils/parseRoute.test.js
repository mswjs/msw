import parseRoute from './parseRoutes'

test('Parses a given url against the mask', () => {
  const mask = 'https://api.com/user/:username'
  const url = 'https://api.com/user/admin'
  expect(parseRoute(mask, route)).toEqual({
    matches: true,
    url: 'https',
    params: {
      username: 'admin'
    }
  })
})
