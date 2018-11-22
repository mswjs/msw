/**
 * Accepts a Mask and converts it to string.
 * Prepends a fixed prefix for RegExp to be recognized as such
 * in string->RegExp parsing.
 */
export default function stringifyMask(mask: string | RegExp): string {
  return mask instanceof RegExp ? `__REGEXP__${mask}` : mask
}
