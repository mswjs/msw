import { pageWith } from 'page-with'
import { waitFor } from '../../support/waitFor'

function createResponseLogRegexp(username: string): RegExp {
  return new RegExp(
    `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} GET https://api\\.github\\.com/users/${username} 200 OK$`,
  )
}

test('prints the response info to the console', async () => {
  const runtime = await pageWith({
    example: require.resolve('../../rest-api/basic.mocks.ts'),
  })

  const waitForResponseLog = async (exp: RegExp) => {
    await waitFor(() => {
      expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
        expect.arrayContaining([expect.stringMatching(exp)]),
      )
    })
  }

  const getResponseLogs = (exp: RegExp) => {
    return runtime.consoleSpy.get('startGroupCollapsed').filter((log) => {
      return exp.test(log)
    })
  }

  const firstResponseLogRegexp = createResponseLogRegexp('octocat')
  await runtime.request('https://api.github.com/users/octocat')
  await waitForResponseLog(firstResponseLogRegexp)

  // Must print the response summary to the console.
  expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)

  const secondResopnseLogRegexp = createResponseLogRegexp('john.doe')
  await runtime.request('https://api.github.com/users/john.doe')
  await waitForResponseLog(secondResopnseLogRegexp)

  /**
   * Must not duplicate response logs for the current and previous requests.
   * @see https://github.com/mswjs/msw/issues/1411
   */
  expect(getResponseLogs(secondResopnseLogRegexp)).toHaveLength(1)
  expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)
})
