export default function invariant(
  predicate: boolean,
  message: string,
  ...messageArgs: any[]
): void {
  if (!predicate) {
    console.error(message, ...messageArgs)
  }
}
