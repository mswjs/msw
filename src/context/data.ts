import { ResponseTransformer } from '../response'

export type DataContext<T> = (payload: T) => ResponseTransformer

export const data: DataContext<Record<string, any>> = (payload) => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')
    res.body = JSON.stringify({ data: payload })
    return res
  }
}
