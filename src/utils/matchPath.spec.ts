import matchPath from './matchPath'

const expectVerbose = (real, expected) => {
  Object.keys(expected).forEach((key) => {
    const value = expected[key]
    it(`returns "${key}" as "${JSON.stringify(value)}"`, () => {
      expect(real).toHaveProperty(key, value)
    })
  })
}

describe('matchPath', () => {
  describe('when matching against a string', () => {
    // Exact mode
    describe('with { exact: true }', () => {
      describe('given matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/admin',
          'https://api.github.com/users/admin',
        )

        expectVerbose(result, {
          matches: true,
          exactMatch: true,
          params: {},
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://api.github.com/users/admin',
        )

        expectVerbose(result, {
          matches: false,
        })
      })

      describe('given non-matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://random.string',
        )

        expectVerbose(result, {
          matches: false,
        })
      })
    })

    // Non-exact mode
    describe('with { exact: false }', () => {
      describe('given matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/admin',
          'https://api.github.com/users/admin',
        )

        expectVerbose(result, {
          matches: true,
          exactMatch: true,
          params: {},
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://api.github.com/users/admin',
        )

        expectVerbose(result, {
          matches: true,
          exactMatch: false,
          params: {},
        })
      })

      describe('given non-matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/admin',
          'https://random.string',
        )

        expectVerbose(result, {
          matches: false,
        })
      })
    })
  })

  describe('when matching against a mask', () => {
    describe('with { exact: true }', () => {
      describe('given exact match', () => {
        const result = matchPath(
          'https://api.github.com/users/:username',
          'https://api.github.com/users/admin',
          {
            exact: true,
          },
        )

        expectVerbose(result, {
          matches: true,
          exactMatch: true,
          params: {
            username: 'admin',
          },
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/:username',
          'https://api.github.com/users',
          {
            exact: true,
          },
        )

        expectVerbose(result, {
          matches: false,
        })
      })

      describe('given non-matching string', () => {
        const result = matchPath(
          'https://api.github/com/users/:username',
          'http://random.string',
          {
            exact: true,
          },
        )

        expectVerbose(result, {
          matches: false,
        })
      })
    })

    describe('with { exact: false }', () => {
      describe('given matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/:username',
          'https://api.github.com/users/admin',
        )

        expectVerbose(result, {
          matches: true,
          exact: true,
          params: {
            username: 'admin',
          },
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/:username',
          'https://api.github.com/users',
        )

        expectVerbose(result, {
          matches: false,
          exact: false,
          params: {
            username: undefined,
          },
        })
      })
    })
  })

  describe('when matching against a RegExp', () => {
    describe('with { exact: true }', () => {})
    describe('with { exact: false }', () => {})
  })
})
