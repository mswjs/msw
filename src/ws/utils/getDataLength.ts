export function getDataLength(
  data: string | ArrayBufferLike | Blob | ArrayBufferView,
): number {
  if (typeof data === 'string') {
    return data.length
  }

  if (data instanceof Blob) {
    return data.size
  }

  return data.byteLength
}
