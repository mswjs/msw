import { Path } from 'node-match-path'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { ResolvedMask } from '../../setupWorker/glossary'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

export function getCleanMask(
  resolvedMask: ResolvedMask,
  baseUrl?: string,
): Path {
  return resolvedMask instanceof URL
    ? getCleanUrl(resolvedMask)
    : resolvedMask instanceof RegExp
    ? resolvedMask
    : getAbsoluteUrl(resolvedMask, baseUrl)
}
