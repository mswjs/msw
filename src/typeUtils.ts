import { ResponseTransformer } from './response'

type Fn = (...arg: any[]) => any

export type RequiredDeep<
  Type,
  U extends Record<string, unknown> | Fn | undefined = undefined,
> = Type extends Fn
  ? Type
  : /**
   * @note The "Fn" type satisfies the predicate below.
   * It must always come first, before the Record check.
   */
  Type extends Record<string, any>
  ? {
      [Key in keyof Type]-?: NonNullable<Type[Key]> extends NonNullable<U>
        ? NonNullable<Type[Key]>
        : RequiredDeep<NonNullable<Type[Key]>, U>
    }
  : Type

export type GraphQLPayloadContext<QueryType extends Record<string, unknown>> = (
  payload: QueryType,
) => ResponseTransformer
