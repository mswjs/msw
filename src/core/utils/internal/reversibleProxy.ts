export interface ReversibleProxy<T extends object> {
  proxy: T
  reverse: () => void
}

export function reversibleProxy<T extends object>(
  target: T,
  handler: ProxyHandler<T>,
): ReversibleProxy<T> {
  const original = target
  const proxy = new Proxy(target, handler)

  return {
    proxy,
    reverse() {
      target = original
    },
  }
}
