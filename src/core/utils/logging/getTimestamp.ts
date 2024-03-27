interface GetTimestampOptions {
  milliseconds?: boolean
}

/**
 * Returns a timestamp string in a "HH:MM:SS" format.
 */
export function getTimestamp(options?: GetTimestampOptions): string {
  const now = new Date()

  let timestamp = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .filter(Boolean)
    .map(String)
    .map((chunk) => chunk.slice(0, 2))
    .map((chunk) => chunk.padStart(2, '0'))
    .join(':')

  if (options?.milliseconds) {
    timestamp += `.${now.getMilliseconds().toString().padStart(3, '0')}`
  }

  return timestamp
}
