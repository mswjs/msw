import { match } from 'node-match-path'
import { getCleanUrl } from 'node-request-interceptor/lib/utils/getCleanUrl'
import { Mask } from '../../setupWorker/glossary'
import { getUrlByMask } from '../getUrlByMask'
import { getCleanMask } from './getCleanMask'

/**
 * Returns the result of matching given request URL
 * against a mask.
 */
export function matchRequestUrl(
  url: URL,
  mask: Mask,
): ReturnType<typeof match> {
  const resolvedMask = getUrlByMask(mask)
  const cleanMask = getCleanMask(resolvedMask)
  const cleanRequestUrl = getCleanUrl(url)

  return match(cleanMask, cleanRequestUrl)
}
