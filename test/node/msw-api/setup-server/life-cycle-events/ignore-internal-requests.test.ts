// @vitest-environment node
import { setupServer } from 'msw/node'
import {
  MSW_REMOTE_SERVER_URL,
  MSW_REMOTE_BOUNDARY_ID,
} from '../../../../../src/node/remoteContext'
import { spyOnLifeCycleEvents } from '../../../../support/utils'

const server = setupServer()

beforeAll(() => {
  // Mock the environment variables required for the remote interception to work.
  vi.stubEnv(MSW_REMOTE_SERVER_URL, 'http://localhost/noop')
  vi.stubEnv(MSW_REMOTE_BOUNDARY_ID, 'abc-123')

  server.listen({
    // Enable remote interception to trigger internal requests.
    // The connection is meant to fail here.
    remote: {
      enabled: true,
    },
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('does not emit life-cycle events for internal requests', async () => {
  const listener = spyOnLifeCycleEvents(server)

  // Must emit no life-cycle events for internal requests.
  expect(listener).not.toHaveBeenCalled()
})
