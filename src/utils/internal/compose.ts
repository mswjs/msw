/**
 * Composes a given list of functions into a new function that
 * executes from right to left.
 */
export function compose(...funcs: Array<(...args: any[]) => any>) {
  return funcs.reduce((f, g) => (...args: any[]) => f(g(...args)))
}
