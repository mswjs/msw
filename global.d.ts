declare const SERVICE_WORKER_CHECKSUM: string

type DeepRequired<
  T,
  U extends object | undefined = undefined
> = T extends object
  ? {
      [P in keyof T]-?: NonNullable<T[P]> extends NonNullable<U | Function>
        ? NonNullable<T[P]>
        : DeepRequired<NonNullable<T[P]>, U>
    }
  : T
