import { test, expect } from '../../playwright.extend'

function createResponseLogRegexp(username: string): RegExp {
  return new RegExp(
    `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} GET https://example\\.com/users/${username} 200 OK$`,
  )
}

test('prints the response info to the console', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
}) => {
  await loadExample(new URL('../../rest-api/basic.mocks.ts', import.meta.url))
  const consoleSpy = spyOnConsole()

  const waitForResponseLog = async (exp: RegExp) => {
    await waitFor(() => {
      expect(consoleSpy.get('startGroupCollapsed')).toEqual(
        expect.arrayContaining([expect.stringMatching(exp)]),
      )
    })
  }

  const getResponseLogs = (exp: RegExp) => {
    return consoleSpy.get('startGroupCollapsed')?.filter((log) => {
      return exp.test(log)
    })
  }

  const firstResponseLogRegexp = createResponseLogRegexp('octocat')
  await fetch('https://example.com/users/octocat')
  await waitForResponseLog(firstResponseLogRegexp)

  // Must print the response summary to the console.
  expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)

  const secondResponseLogRegExp = createResponseLogRegexp('john.doe')
  await fetch('https://example.com/users/john.doe')
  await waitForResponseLog(secondResponseLogRegExp)

  /**
   * Must not duplicate response logs for the current and previous requests.
   * @see https://github.com/mswjs/msw/issues/1411
   */
  expect(getResponseLogs(secondResponseLogRegExp)).toHaveLength(1)
  expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)
})
