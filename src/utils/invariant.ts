export default function invariant(predicate: boolean, ...logArgs: any[]) {
  if (!predicate) {
    console.error(...logArgs)
  }
}
