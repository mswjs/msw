export type MaybePromise<T> = T | Promise<T>

/**
 * Blocks inference from the annotated position, like the built-in `NoInfer`,
 * but resolves to a plain type once instantiated. The built-in `NoInfer` stays
 * an opaque wrapper, which makes TypeScript report response body mismatches on
 * the whole object literal instead of the offending property.
 */
export type TransparentNoInfer<T> = [T][T extends any ? 0 : never]
