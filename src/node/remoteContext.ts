import { invariant } from 'outvariant'
import { remoteHandlersContext } from './setupRemoteServer'

export const remoteContext = {
  variableName: 'MSW_REMOTE_CONTEXT_ID',
  getContextId() {
    const store = remoteHandlersContext.getStore()

    invariant(
      store != null,
      'Failed to call ".getContextId()" on remote context: no context found. Did you call this outside of the `remote.boundary()` scope?',
    )

    return store.contextId
  },
}
