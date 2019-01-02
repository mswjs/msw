/**
 * Path formatting.
 * @see https://github.com/expressjs/express/blob/9e406dfee22f172c084c900e235e1ac7e9497a24/lib/utils.js#L294
 */
import { Mask } from '../msw'

export default function formatPath(
  path: Mask[] | Mask,
  keys: any[],
  sensitive?: boolean,
  strict?: boolean,
) {
  if (path instanceof RegExp) {
    return path
  }

  if (Array.isArray(path)) {
    path = '(' + path.join('|') + ')'
  }

  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(
      _,
      slash,
      format,
      key,
      capture,
      optional,
      star,
    ) {
      keys.push({ name: key, optional: !!optional })
      slash = slash || ''
      return (
        '' +
        (optional ? '' : slash) +
        '(?:' +
        (optional ? slash : '') +
        (format || '') +
        (capture || ((format && '([^/.]+?)') || '([^/]+?)')) +
        ')' +
        (optional || '') +
        (star ? '(/*)?' : '')
      )
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)')

  return new RegExp('^' + path + '$', sensitive ? '' : 'i')
}
