/**
 * @jest-environment node
 */
const fs = require('fs')
const init = require('./init')

afterEach(() => {
  jest.restoreAllMocks()
})

test('logs an error and shuts down if create directory fails', async () => {
  const error = new Error('Could not create this directory')
  jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(error)

  const exitSpy = jest.spyOn(process, 'exit').mockImplementationOnce(() => {
    throw error
  })

  const consoleSpy = jest
    .spyOn(console, 'error')
    .mockImplementationOnce(jest.fn())

  const publicDir = 'public'

  await expect(init({ publicDir, save: false })).rejects.not.toBeUndefined()

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Failed to create a Service Worker'),
    expect.stringContaining(publicDir),
    error,
  )
  expect(exitSpy).toHaveBeenCalledWith(1)
})
