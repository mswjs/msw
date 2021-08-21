import * as path from 'path'
import { pageWith } from 'page-with'
import { StatusCodeColor } from '../../src/utils/logging/getStatusCodeColor'
import { waitFor } from '../support/waitFor'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'basic.mocks.ts') })
}

test('prints a captured request info into browser console', async () => {
  const runtime = await createRuntime()
  await runtime.request('https://api.github.com/users/octocat')

  await waitFor(() => {
    expect(runtime.consoleSpy.get('raw').get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `^\\[MSW\\] %s %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} GET https://api.github.com/users/octocat color:${StatusCodeColor.Success} 200 OK color:inherit$`,
          ),
        ),
      ]),
    )
  })
})
