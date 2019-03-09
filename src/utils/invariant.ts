export default function invariant(predicate: boolean, ...logArgs: any[]): void {
  if (!predicate) {
    console.error(...logArgs)
  }
}
