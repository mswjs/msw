/**
 * Colors for logging the direction of intercepted events.
 *
 * @note A standalone module so consumers interested only in the
 * palette (e.g. `sse`, `msw/graphql` loggers) don't pull the entire
 * WebSocket logger into their graph.
 */
export const colors = {
  system: '#3b82f6',
  outgoing: '#22c55e',
  incoming: '#ef4444',
  mocked: '#ff6a33',
}
