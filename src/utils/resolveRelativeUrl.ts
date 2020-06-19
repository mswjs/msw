import { Mask } from '../setupWorker/glossary'

/**
 * Resolves a relative URL to the absolute URL with the same hostname.
 * Ignores regular expressions.
 */
export const resolveRelativeUrl = <T extends Mask>(mask: T): T => {
  // Global `location` object doesn't exist in Node.
  // Relative request predicate URL cannot become absolute.
  const hasLocation = typeof location !== 'undefined'

  return typeof mask === 'string' && mask.startsWith('/')
    ? ((`${hasLocation ? location.origin : ''}${mask}` as string) as T)
    : mask
}
