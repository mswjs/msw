import { invariant } from 'outvariant'
import type { AnyHandler } from '../../experimental/handlers-controller'

const kSiblingHandlers = Symbol('kSiblingHandlers')
const kIsSiblingHandler = Symbol('kIsSiblingHandler')

export function attachSiblingHandlers<T extends AnyHandler>(
  owner: T,
  siblings: Array<AnyHandler>,
): T {
  invariant(
    getSiblingHandlers(owner).length === 0,
    'Failed to merge handlers: the owner "%s" handler is already merged',
    owner.kind,
  )

  Object.defineProperty(owner, kSiblingHandlers, {
    value: siblings,
    enumerable: false,
    writable: false,
    configurable: false,
  })

  // Mark the siblings so introspection (e.g. `.listHandlers()`) can tell
  // explicitly registered handlers from their implementation details.
  // Shared siblings can be attached to multiple owners, so skip the
  // already-marked ones.
  for (const sibling of siblings) {
    if (!isSiblingHandler(sibling)) {
      Object.defineProperty(sibling, kIsSiblingHandler, {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
      })
    }
  }

  return owner
}

export function getSiblingHandlers(owner: AnyHandler): Array<AnyHandler> {
  return Reflect.get(owner, kSiblingHandlers) || []
}

export function isSiblingHandler(handler: AnyHandler): boolean {
  return Reflect.get(handler, kIsSiblingHandler) === true
}
