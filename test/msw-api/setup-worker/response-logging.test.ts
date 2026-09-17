import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

function createResponseLogRegexp(username: string): RegExp {
  return new RegExp(
    `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} GET https://example\\.com/users/${username} 200 OK$`,
  )
}

const handlers = [
  http.get('https://example.com/users/:username', ({ params }) => {
    const { username } = params

    return HttpResponse.json({
      name: 'John Maverick',
      originalUsername: username,
    })
  }),
]

const test = defineNetwork({ handlers })

test('prints the response info to the console', async ({
  spyOnConsole,
  fetch,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  const waitForResponseLog = async (exp: RegExp) => {
    await expect
      .poll(() => consoleSpy.get('startGroupCollapsed'))
      .toEqual(expect.arrayContaining([expect.stringMatching(exp)]))
  }

  const getResponseLogs = (exp: RegExp) => {
    return consoleSpy.get('startGroupCollapsed')?.filter((log) => {
      return exp.test(log)
    })
  }

  const firstResponseLogRegexp = createResponseLogRegexp('octocat')
  const firstResponse = await fetch('https://example.com/users/octocat')
  expect(firstResponse.status()).toBe(200)

  if (task.file.projectName === 'browser') {
    await waitForResponseLog(firstResponseLogRegexp)
    // Must print the response summary to the console.
    expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)
  }

  const secondResponseLogRegExp = createResponseLogRegexp('john.doe')
  const secondResponse = await fetch('https://example.com/users/john.doe')
  expect(secondResponse.status()).toBe(200)

  if (task.file.projectName === 'browser') {
    await waitForResponseLog(secondResponseLogRegExp)
    /**
     * Must not duplicate response logs for the current and previous requests.
     * @see https://github.com/mswjs/msw/issues/1411
     */
    expect(getResponseLogs(secondResponseLogRegExp)).toHaveLength(1)
    expect(getResponseLogs(firstResponseLogRegexp)).toHaveLength(1)
  }
})
