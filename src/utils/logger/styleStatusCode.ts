export function styleStatusCode(status: number) {
  if (status < 300) {
    return 'color:#69AB32;'
  }

  if (status < 400) {
    return 'color:#F0BB4B;'
  }

  return 'color:#E95F5D;'
}
