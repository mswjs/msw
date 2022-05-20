import { setTimeout as nodeSetTimeout } from 'timers'

// Polyfill the global "setTimeout" so MSW could be used
// with "jest.useFakeTimers()". MSW response handling
// is wrapped in "setTimeout", and without this polyfill
// you'd have to manually advance the timers for the response
// to finally resolve.
export const setTimeout = nodeSetTimeout
