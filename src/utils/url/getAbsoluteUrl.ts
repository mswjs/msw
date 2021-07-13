import { Mask } from '../../setupWorker/glossary'

/**
 * Returns an absolute URL based on the given relative URL, if possible.
 * Ignores regular expressions.
 */
export const getAbsoluteUrl = <T extends Mask>(mask: T): T => {
  // Global `location` object doesn't exist in Node.
  // Relative request predicate URL cannot become absolute.
  const hasLocation = typeof location !== 'undefined'

  return typeof mask === 'string' && mask.startsWith('/')
    ? (`${hasLocation ? location.origin : ''}${mask}` as string as T)
    : mask
}
