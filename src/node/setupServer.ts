import { interceptClientRequest } from 'node-request-interceptor/lib/interceptors/ClientRequest'
import { interceptXMLHttpRequest } from 'node-request-interceptor/lib/interceptors/XMLHttpRequest'
import { createSetupServer } from './createSetupServer'

export const setupServer = createSetupServer(
  interceptClientRequest,
  interceptXMLHttpRequest,
)
