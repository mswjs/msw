import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { StatusCodeColor } from '../../../src/core/utils/logging/getStatusCodeColor'

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

test('prints the intercepted request info into browser console', async ({
  spyOnConsole,
  fetch,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  await fetch('https://example.com/users/octocat')

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(
              `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} GET https://example.com/users/octocat \\(%c200 OK%c\\) color:${StatusCodeColor.Success} color:inherit$`,
            ),
          ),
        ]),
      )
  }
})
