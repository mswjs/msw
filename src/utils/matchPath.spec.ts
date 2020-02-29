import { matchPath } from './matchPath'

describe('Determines matching paths', () => {
  test('when matching against complete string (exact)', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://api.github.com/users/admin',
        exact: true,
      }),
    ).toEqual({
      matches: true,
      isExact: true,
      params: {},
    })
  })

  test('when matching against incomplete string (non-exact)', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://api.github.com/users',
      }),
    ).toEqual({
      matches: true,
      isExact: false,
      params: {},
    })
  })

  test('when matching against case-different string (insensitive)', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://API.github.COM/uSeRs',
      }),
    ).toEqual({
      matches: true,
      isExact: false,
      params: {},
    })
  })

  test('when matching against mask', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://api.github.com/users/:username',
      }),
    ).toEqual({
      matches: true,
      isExact: true,
      params: {
        username: 'admin',
      },
    })
  })

  test('when matching against RegExp', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: /api.github.com/,
      }),
    ).toEqual({
      matches: true,
      isExact: false,
      params: {},
    })
  })
})

describe('Determines non-matching paths', () => {
  test('when matching against incomplete string (exact)', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://api.github.com/users',
        exact: true,
      }),
    ).toEqual({
      matches: false,
    })
  })

  test('when matching against different string', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://backend.com/foo',
      }),
    ).toEqual({
      matches: false,
    })
  })

  test('when matching against case-different string (senstive)', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://API.github.COM/uSeRs/admin',
        sensitive: true,
      }),
    ).toEqual({
      matches: false,
    })
  })

  test('when matching against mask', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: 'https://api.github.com/users/:username/:messageId',
      }),
    ).toEqual({
      matches: false,
    })
  })

  test('when matching against RegExp', () => {
    expect(
      matchPath('https://api.github.com/users/admin', {
        path: /api.github.com\/users\/\w+\/\d+/,
      }),
    ).toEqual({
      matches: false,
    })
  })
})
