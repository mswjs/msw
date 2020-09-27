import { ResponseTransformer } from '../response'
import { json } from './json'

export type DataContext<T> = (payload: T) => ResponseTransformer

/**
 * Returns a GraphQL body payload.
 */
export const data: DataContext<Record<string, any>> = (payload) => {
  return json({ data: payload }, { merge: true })
}
