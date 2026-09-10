import { vi } from 'vitest'

/**
 * @note The list of standard Node.js modules missing
 * in the React Native runtime.
 */
const reactNativeMissingModules = ['events', 'node:events']

reactNativeMissingModules.forEach((moduleName) => {
  vi.doMock(moduleName, () => {
    throw new Error(
      `Failed to import module "${moduleName}": it does not exist in React Native. This likely means MSW tries to import something too optimistically in that environment.`,
    )
  })
})
