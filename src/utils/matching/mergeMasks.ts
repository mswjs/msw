import { pathToRegExp } from 'node-match-path'
import { Mask } from '../../setupWorker/glossary'

export function mergeMasks(base: string, mask: Mask): Mask {
  const normalizedBase = base.replace(/\/$/, '')

  if (typeof mask === 'string') {
    try {
      return new URL(mask, base).href
    } catch (error) {
      return normalizedBase.concat(mask)
    }
  }

  return pathToRegExp(normalizedBase + mask.source)
}
