import { RequestApplicator } from '../../setupWorker/glossary'

export function use(
  currentHandlers: RequestApplicator[],
  ...handlers: RequestApplicator[]
): void {
  currentHandlers.unshift(...handlers)
}

export function restoreHandlers(handlers: RequestApplicator[]): void {
  handlers.forEach((handler) => {
    handler.markAsSkipped(false)
  })
}

export function resetHandlers(
  initialHandlers: RequestApplicator[],
  ...nextHandlers: RequestApplicator[]
) {
  return nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers]
}
