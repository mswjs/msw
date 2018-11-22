import assertUrl from './assertUrl'

test('Exposes expected shape', () => {
  const mask = 'https://api.com/user/:username'
  const url = 'https://api.com/user/admin'
  expect(assertUrl(mask, url)).toEqual({
    url,
    mask,
    matches: true,
    params: {
      username: 'admin',
    },
  })
})

test('Resolves urls that match the mask', () => {
  expect(
    assertUrl('https://api.com/users', 'https://api.com/users'),
  ).toHaveProperty('matches', true)

  expect(
    assertUrl('https://api.com/user/:username', 'https://api.com/user/admin'),
  ).toHaveProperty('matches', true)

  expect(
    assertUrl(
      'https://api.com/user/:username/messages',
      'https://api.com/user/admin/messages',
    ),
  ).toHaveProperty('matches', true)
})

test('Supports "*" for any match', () => {
  expect(
    assertUrl('https://*/user', 'https://api.github.com/user'),
  ).toHaveProperty('matches', true)
  expect(
    assertUrl('https://*/user', 'https://facebook.com/user'),
  ).toHaveProperty('matches', true)
  expect(assertUrl('https://*/user', 'https://user.com/api')).toHaveProperty(
    'matches',
    false,
  )
})

test('Supports RegExp as mask', () => {
  expect(
    assertUrl(/api.github.com/, 'https://api.github.com/users'),
  ).toHaveProperty('matches', true)

  expect(
    assertUrl(/api.github.com/, 'https://random.website/github/api'),
  ).toHaveProperty('matches', false)
})

test('Rejects urls that do not match the mask', () => {
  expect(
    assertUrl('https://api.com/user/:username', 'https://random.url'),
  ).toHaveProperty('matches', false)

  expect(
    assertUrl('https://api.com/user/:username', 'https://api.com/users/admin'),
  ).toHaveProperty('matches', false)

  expect(
    assertUrl(
      'https://api.com/user/:username',
      'https://api.com/user/admin/messages',
    ),
  ).toHaveProperty('matches', false)

  expect(
    assertUrl(
      'https://api.com/user/:username',
      'prefix-https://api.com/user/admin',
    ),
  ).toHaveProperty('matches', false)
})

test('Returns proper request params', () => {
  expect(
    assertUrl('https://api.com/users', 'https://api.com/users'),
  ).toHaveProperty('params', {})

  expect(
    assertUrl('https://api.com/user/:userId', 'https://api.com/user/123'),
  ).toHaveProperty('params', { userId: '123' })

  expect(
    assertUrl(
      'https://api.com/user/:username/:messageId',
      'https://api.com/user/admin/82',
    ),
  ).toHaveProperty('params', { username: 'admin', messageId: '82' })
})
