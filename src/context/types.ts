import { ResponseTransformer } from '../response'

export type GraphQLPayloadContext<T> = (payload: T) => ResponseTransformer
