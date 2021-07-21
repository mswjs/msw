type Fn = (...arg: any[]) => any

export type DeepRequired<
  T,
  U extends Record<string, any> | Fn | undefined = undefined,
> = T extends Record<string, any>
  ? {
      [P in keyof T]-?: NonNullable<T[P]> extends NonNullable<U | Fn>
        ? NonNullable<T[P]>
        : DeepRequired<NonNullable<T[P]>, U>
    }
  : T
