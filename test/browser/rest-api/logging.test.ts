import { test, expect } from '../playwright.extend'
import { StatusCodeColor } from '../../../src/core/utils/logging/getStatusCodeColor'
import { waitFor } from '../../support/waitFor'

test('prints the intercepted request info into browser console', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./basic.mocks.ts'))

  await fetch('https://example.com/users/octocat')

  await waitFor(() => {
    expect(consoleSpy.get('raw')?.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `^\\[MSW\\] %s %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} GET https://example.com/users/octocat color:${StatusCodeColor.Success} 200 OK color:inherit$`,
          ),
        ),
      ]),
    )
  })
})
