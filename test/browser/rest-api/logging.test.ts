import { test, expect } from '../playwright.extend'
import { waitFor } from '../../support/waitFor'

test('prints the intercepted request info into browser console', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./basic.mocks.ts', import.meta.url))

  await fetch('https://example.com/users/octocat')

  await waitFor(() => {
    expect(consoleSpy.get('raw')!.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} GET https://example.com/users/octocat \\(%c200 OK%c\\) color:#69AB32 color:inherit$`,
          ),
        ),
      ]),
    )
  })
})
