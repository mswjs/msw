/**
 * Returns a timestamp string in a "HH:MM:SS" format.
 */
export function getTimestamp(): string {
  const now = new Date()

  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(String)
    .map((chunk) => chunk.slice(0, 2))
    .map((chunk) => chunk.padStart(2, '0'))
    .join(':')
}
