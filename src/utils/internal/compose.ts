type ArityOneFn = (arg: any) => any
type PickLastInTuple<T extends any[]> = T extends [
  ...rest: infer U,
  argn: infer L,
]
  ? L
  : never
type FirstFnParameterType<T extends any[]> = Parameters<PickLastInTuple<T>>[any]
type LastFnParameterType<T extends any[]> = ReturnType<T[0]>

/**
 * Composes a given list of functions into a new function that
 * executes from right to left.
 */
export function compose<
  T extends ArityOneFn[],
  LeftReturnType extends FirstFnParameterType<T>,
  RightReturnType extends LastFnParameterType<T>
>(
  ...fns: T
): (
  ...args: LeftReturnType extends never ? never[] : [LeftReturnType]
) => RightReturnType {
  return (...args) => {
    return fns.reduceRight((leftFn: any, rightFn) => {
      return leftFn instanceof Promise
        ? Promise.resolve(leftFn).then(rightFn)
        : rightFn(leftFn)
    }, args[0])
  }
}
