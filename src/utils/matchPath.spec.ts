import matchPath from './matchPath'

describe('matchPath', () => {
  describe('when expected a string', () => {
    const expected = 'https://api.github.com/users/admin'

    describe('given an exact string', () => {
      const actual = 'https://api.github.com/users/admin'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have empty parameters', () => {
          expect(result).toHaveProperty('params', {})
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have empty parameters', () => {
          expect(result).toHaveProperty('params', {})
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have empty parameters', () => {
          expect(result).toHaveProperty('params', {})
        })
      })
    })

    describe('given a partially matching string', () => {
      const actual = 'https://api.github.com/users'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })
    })

    describe('given a non-matching string', () => {
      const actual = 'https://google.com'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })
    })
  })

  describe('when expected a mask', () => {
    const expected = 'https://api.github.com/users/:username'

    describe('given an exact string', () => {
      const actual = 'https://api.github.com/users/admin'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have "username" parameter equal "admin"', () => {
          expect(result).toHaveProperty('params', { username: 'admin' })
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have "username" parameter equal "admin"', () => {
          expect(result).toHaveProperty('params', { username: 'admin' })
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have "username" parameter equal "admin"', () => {
          expect(result).toHaveProperty('params', { username: 'admin' })
        })
      })
    })

    describe('given a partially matching string', () => {
      const actual = 'https://api.github.com/users/admin/repo'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should not match exactly', () => {
          expect(result).toHaveProperty('exact', false)
        })

        it('should have "username" parameter equal "admin"', () => {
          expect(result).toHaveProperty('params', { username: 'admin' })
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should not match exactly', () => {
          expect(result).toHaveProperty('exact', false)
        })

        it('should have "username" parameter equal "admin"', () => {
          expect(result).toHaveProperty('params', { username: 'admin' })
        })
      })
    })
  })

  describe('when expected an expression', () => {
    const expected = /(\w+).github.com/

    describe('given an exact string', () => {
      const actual = 'api.github.com'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have parameters as Array', () => {
          expect(result.params).toBeInstanceOf(Array)
        })

        it('should have first parameter equal "api"', () => {
          expect(result.params).toEqual(['api'])
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have parameters as Array', () => {
          expect(result.params).toBeInstanceOf(Array)
        })

        it('should have first parameter equal "api"', () => {
          expect(result.params).toEqual(['api'])
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should match exactly', () => {
          expect(result).toHaveProperty('exact', true)
        })

        it('should have parameters as Array', () => {
          expect(result.params).toBeInstanceOf(Array)
        })

        it('should have first parameter equal "api"', () => {
          expect(result.params).toEqual(['api'])
        })
      })
    })

    describe('given a partially matching string', () => {
      const actual = 'https://api.github.com/users/admin'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should not match exactly', () => {
          expect(result).toHaveProperty('exact', false)
        })

        it('should have parameters as Array', () => {
          expect(result.params).toBeInstanceOf(Array)
        })

        it('should have first parameter equal "api"', () => {
          expect(result.params).toEqual(['api'])
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should match', () => {
          expect(result).toHaveProperty('matches', true)
        })

        it('should not match exactly', () => {
          expect(result).toHaveProperty('exact', false)
        })

        it('should have parameters as Array', () => {
          expect(result.params).toBeInstanceOf(Array)
        })

        it('should have first parameter equal "api"', () => {
          expect(result.params).toEqual(['api'])
        })
      })
    })

    describe('given a non-matching string', () => {
      const actual = 'https://github.com/users'

      describe('using default mode', () => {
        const result = matchPath(expected, actual)

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })

      describe('using exact mode', () => {
        const result = matchPath(expected, actual, { exact: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })

      describe('using strict mode', () => {
        const result = matchPath(expected, actual, { strict: true })

        it('should not match', () => {
          expect(result).toHaveProperty('matches', false)
        })

        it('should not have parameters', () => {
          expect(result).not.toHaveProperty('params')
        })
      })
    })
  })
})

/*
describe('matchPath', () => {
  describe('when matching against a string', () => {
    // Exact mode
    describe('with { exact: true }', () => {
      describe('given matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/admin',
          'https://api.github.com/users/admin',
        )

        expect(result).toEqual({
          matches: true,
          exact: true,
          params: {},
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://api.github.com/users/admin',
        )

        expect(result).toEqual({
          matches: false,
        })
      })

      describe('given non-matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://random.string',
        )

        expect(result).toEqual({
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

        expect(result).toEqual({
          matches: true,
          exact: true,
          params: {},
        })
      })

      describe('given partially matching string', () => {
        const result = matchPath(
          'https://api.github.com/users',
          'https://api.github.com/users/admin',
        )

        expect(result).toEqual({
          matches: true,
          exact: false,
          params: {},
        })
      })

      describe('given non-matching string', () => {
        const result = matchPath(
          'https://api.github.com/users/admin',
          'https://random.string',
        )

        expect(result).toEqual({
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

        expect(result).toEqual({
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
          {
            exact: true,
          },
        )

        expect(result).toEqual({
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

        expect(result).toEqual({
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

        expect(result).toEqual({
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

        expect(result).toEqual({
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
*/
