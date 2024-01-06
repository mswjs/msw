const urlCache = new Map<string, URL>()

/**
 * Returns the URL object for the given request. The URL object is cached so that
 * subsequent calls to this function with the same request or requests to the same
 * url will return the same URL object, to avoid multiple URL object allocations and
 * parsing the same url multiple times.
 */
export function urlFromRequestOrCache(request: Request): URL {
  const requestUrl = request.url
  let url = urlCache.get(requestUrl)
  if (!url) {
    url = new URL(requestUrl)
    urlCache.set(requestUrl, url)
  }
  return url
}
