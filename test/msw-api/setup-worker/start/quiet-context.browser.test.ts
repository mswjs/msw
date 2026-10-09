import { expect, onTestFinished, test, vi } from 'vitest'
import { defineNetwork, NetworkReadyState } from 'msw/experimental'
import { createDefaultNetworkOptions } from 'msw/browser'

test('does not print lifecycle messages when the network context is quiet', async () => {
  const groupCollapsedSpy = vi
    .spyOn(console, 'groupCollapsed')
    .mockImplementation(() => {})
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  onTestFinished(() => {
    groupCollapsedSpy.mockRestore()
    logSpy.mockRestore()
  })

  const network = defineNetwork(createDefaultNetworkOptions())
  onTestFinished(async () => {
    if (network.readyState === NetworkReadyState.ENABLED) {
      await network.disable()
    }
  })
  network.configure({ context: { quiet: true } })

  await network.enable()
  await network.disable()

  expect.soft(groupCollapsedSpy).not.toHaveBeenCalled()
  expect(logSpy).not.toHaveBeenCalled()
})
