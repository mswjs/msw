import { RequestHandlersList } from '../../setupWorker/glossary'

export function use(
  currentHandlers: RequestHandlersList,
  ...handlers: RequestHandlersList
): void {
  currentHandlers.unshift(...handlers)
}

export function restoreHandlers(handlers: RequestHandlersList): void {
  handlers.forEach((handler) => {
    if ('shouldSkip' in handler) {
      handler.shouldSkip = false
    }
  })
}

export function resetHandlers(
  initialHandlers: RequestHandlersList,
  ...nextHandlers: RequestHandlersList
) {
  return nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers]
}
