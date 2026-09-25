import { truncateMessage } from './truncate-message'

/**
 * Format the given WebSocket data or protocol message for logging.
 */
export async function getPublicData(data: unknown): Promise<string> {
  if (typeof data === 'string') {
    return truncateMessage(data)
  }

  if (data instanceof Blob) {
    const text = await data.text()
    return `Blob(${truncateMessage(text)})`
  }

  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const text = new TextDecoder().decode(data)
    return `ArrayBuffer(${truncateMessage(text)})`
  }

  // Protocol messages can be any structured data.
  return truncateMessage(JSON.stringify(data))
}
