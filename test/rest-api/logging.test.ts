import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'basic.mocks.ts') })
}

test('prints a captured request info into browser console', async () => {
  const runtime = await createRuntime()
  await runtime.request('https://api.github.com/users/octocat')

  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] \d{2}:\d{2}:\d{2} GET https:\/\/api\.github\.com\/users\/octocat 200 OK/,
      ),
    ]),
  )
})
