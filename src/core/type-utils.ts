export type MaybePromise<T> = T | Promise<T>

/**
 * Blocks inference from the annotated position, like the built-in `NoInfer`,
 * but resolves to a plain type once instantiated. The built-in `NoInfer` stays
 * an opaque wrapper, which makes TypeScript report response body mismatches on
 * the whole object literal instead of the offending property.
 */
export type TransparentNoInfer<T> = [T][T extends any ? 0 : never]

/**
 * Turns a union of types into an intersection of its members.
 */
export type UnionToIntersection<Union> = (
  Union extends unknown ? (member: Union) => void : never
) extends (member: infer Intersection) => void
  ? Intersection
  : never
