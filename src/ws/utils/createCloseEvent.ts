export function createCloseEvent(init: any): CloseEvent {
  const { type, target, code, reason } = init
  const wasClean = init.wasClean ?? code === 1000

  const event = new CloseEvent(type, { code, reason, wasClean })

  if (target) {
    Object.defineProperty(event, 'target', { writable: false, value: target })
  }

  return event
}
