/**
 * @see https://github.com/mswjs/msw/pull/1858
 * @see https://github.com/mswjs/msw/issues/1868
 */
import { setupServer } from 'msw/native'

test('calls "setupServer" without errors in React Native', async () => {
  /**
   * @note Asserting that mocking works is not possible with
   * the current testing setup. We force Vitest to alias "msw"
   * imports to their ESM build, which is a hack.
   *
   * We need Vitest to load the ESM build here in order to
   * use "vi.mock()" to mock the "node:events" imports to throw.
   * Vitest doesn't support module mocking in CommonJS.
   *
   * But aliasing the build isn't enough for it to function.
   * The root-level package.json is still CJS, which, I suspects,
   * resolves any subsequent in-build imports to their CJS counterparts.
   */
  expect(() => setupServer()).not.toThrow()
})
