import { Mask } from '../composeMocks/glossary'

/**
 * Resolves a relative URL to the absolute URL with the same hostname.
 * Ignores regular expressions.
 */
export const resolveRelativeUrl = (mask: Mask) => {
  return typeof mask === 'string' && mask.startsWith('/')
    ? `${location.origin}${mask}`
    : mask
}
