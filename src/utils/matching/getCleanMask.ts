import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { Mask, ResolvedMask } from '../../setupWorker/glossary'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

export function getCleanMask(resolvedMask: ResolvedMask): Mask {
  return resolvedMask instanceof URL
    ? getCleanUrl(resolvedMask)
    : resolvedMask instanceof RegExp
    ? resolvedMask
    : getAbsoluteUrl(resolvedMask)
}
