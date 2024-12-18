import { invariant } from 'outvariant'
import { remoteHandlersContext } from './setupRemoteServer'

export const MSW_REMOTE_SERVER_URL = 'MSW_REMOTE_SERVER_URL'
export const MSW_REMOTE_BOUNDARY_ID = 'MSW_REMOTE_BOUNDARY_ID'

export interface RemoteContext {
  serverUrl: URL
  boundary: {
    id: string
  }
}

export function getRemoteContext(): RemoteContext {
  const store = remoteHandlersContext.getStore()

  invariant(
    store,
    'Failed to retrieve remote context: no context found. Did you forget to call this within a `remote.boundary()`?',
  )

  return {
    serverUrl: store.serverUrl,
    boundary: {
      id: store.boundaryId,
    },
  }
}

export function getRemoteContextFromEnvironment(): RemoteContext {
  const serverUrl = process.env[MSW_REMOTE_SERVER_URL]
  const boundaryId = process.env[MSW_REMOTE_BOUNDARY_ID]

  invariant(
    serverUrl,
    'Failed to retrieve the remote context from environment: server URL is missing',
  )
  invariant(
    boundaryId,
    'Failed to retrieve the remote context from environment: boundary ID is missing',
  )

  return {
    serverUrl: new URL(serverUrl),
    boundary: {
      id: boundaryId,
    },
  }
}

export function getRemoteEnvironment() {
  const remoteContext = getRemoteContext()

  return {
    [MSW_REMOTE_SERVER_URL]: remoteContext.serverUrl.toString(),
    [MSW_REMOTE_BOUNDARY_ID]: remoteContext.boundary.id,
  }
}
