import type { WebSocketData } from '@mswjs/interceptors/WebSocket'
import { isObject } from '#core/utils/internal/isObject'
import { truncateMessage } from './truncate-message'

export async function getPublicData(data: WebSocketData): Promise<string> {
  if (data instanceof Blob) {
    const text = await data.text()
    return `Blob(${truncateMessage(text)})`
  }

  // Handle all ArrayBuffer-like objects.
  if (isObject(data)) {
    const text = new TextDecoder().decode(data as ArrayBuffer)
    return `ArrayBuffer(${truncateMessage(text)})`
  }

  return truncateMessage(data)
}
