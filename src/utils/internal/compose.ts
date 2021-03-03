type ArityOneFunction = (arg: any) => any

type LengthOfTuple<Tuple extends any[]> = Tuple extends { length: infer L }
  ? L
  : never

type DropFirstInTuple<Tuple extends any[]> = Tuple extends [
  arg: any,
  ...rest: infer LastArg
]
  ? LastArg
  : Tuple

type LastInTuple<Tuple extends any[]> = Tuple[LengthOfTuple<
  DropFirstInTuple<Tuple>
>]

type FirstFnParameterType<Functions extends ArityOneFunction[]> = Parameters<
  LastInTuple<Functions>
>[any]

type LastFnParameterType<Functions extends ArityOneFunction[]> = ReturnType<
  Functions[0]
>

/**
 * Composes a given list of functions into a new function that
 * executes from right to left.
 */
export function compose<
  Functions extends ArityOneFunction[],
  LeftReturnType extends FirstFnParameterType<Functions>,
  RightReturnType extends LastFnParameterType<Functions>
>(
  ...fns: Functions
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
