import { getCleanUrl } from 'node-request-interceptor/lib/utils/getCleanUrl'
import { Mask, ResolvedMask } from '../../setupWorker/glossary'
import { resolveRelativeUrl } from '../resolveRelativeUrl'

export function getCleanMask(resolvedMask: ResolvedMask): Mask {
  return resolvedMask instanceof URL
    ? getCleanUrl(resolvedMask)
    : resolvedMask instanceof RegExp
    ? resolvedMask
    : resolveRelativeUrl(resolvedMask)
}
