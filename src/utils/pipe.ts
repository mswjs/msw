export const pipe = (...funcs: Array<(...args: any[]) => any>) => {
  return funcs.reduce((f, g) => (...args: any[]) => f(g(...args)))
}
