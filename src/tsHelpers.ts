export type Override<T1, T2> = T2 extends any ? Omit<T1, keyof T2> & T2 : never
