import { RequestHandler } from '../../handlers/RequestHandler'

export function use(
  currentHandlers: RequestHandler[],
  ...handlers: RequestHandler[]
): void {
  currentHandlers.unshift(...handlers)
}

export function restoreHandlers(handlers: RequestHandler[]): void {
  handlers.forEach((handler) => {
    handler.markAsSkipped(false)
  })
}

export function resetHandlers(
  initialHandlers: RequestHandler[],
  ...nextHandlers: RequestHandler[]
) {
  return nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers]
}
