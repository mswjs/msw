type CustomFunction = () => void

export type OnUnhandledRequest = 'bypass' | 'warn' | 'error' | CustomFunction
