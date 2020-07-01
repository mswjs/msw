import { MockedRequest } from './handlers/requestHandler'

type CustomFunction = (req: MockedRequest) => void

export type OnUnhandledRequest = 'bypass' | 'warn' | 'error' | CustomFunction
