/**
 * Composes a given list of functions into a new function that
 * executes from right to left.
 */
export function compose(...funcs: Array<(...args: any[]) => any>) {
  return funcs.reduce((f, g) => {
    return (...args: any[]) => {
      const res = g(...args)

      if (res instanceof Promise) {
        return Promise.resolve(res).then(f)
      }

      return f(res)
    }
  })
}
