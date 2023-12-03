const cache = new Map<string, URL>()

export function memoizedUrl(url: string, base?: string): URL {
  const key = `${url}|${base}`
  if (!cache.has(key)) {
    cache.set(key, new URL(url, base))
  }
  return cache.get(key) as URL
}
