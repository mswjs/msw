declare const SERVICE_WORKER_CHECKSUM: string

type DeepRequired<
  T,
  U extends Record<string, any> | Function | undefined = undefined
> = T extends Record<string, any>
  ? {
      [P in keyof T]-?: NonNullable<T[P]> extends NonNullable<U | Function>
        ? NonNullable<T[P]>
        : DeepRequired<NonNullable<T[P]>, U>
    }
  : T
