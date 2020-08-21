/**
 * Returns a HEX color for a given response status code number.
 */
export function getStatusCodeColor(status: number) {
  if (status < 300) {
    return '#69AB32'
  }

  if (status < 400) {
    return '#F0BB4B'
  }

  return '#E95F5D'
}
