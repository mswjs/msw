import * as http from 'node:http'
import type { AddressInfo } from 'node:net'
import type { BrowserCommand } from 'vitest/node'
// Import the "BrowserCommandContext" augmentation so "context.page" is typed.
import type {} from '@vitest/browser-playwright'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /**
     * Start an HTTP server that reads every request and destroys
     * its socket without responding. Requests to it always fail
     * with a network error. Returns the server URL.
     */
    startUnresponsiveServer: () => Promise<string>
    stopUnresponsiveServer: (serverUrl: string) => Promise<void>
    /**
     * Force garbage collection and count the objects with the given
     * constructor name that are still alive in the page's heap.
     */
    countHeapObjects: (constructorName: string) => Promise<number>
  }
}

const unresponsiveServers = new Map<string, http.Server>()

const startUnresponsiveServer: BrowserCommand<[], string> = async () => {
  const server = http.createServer((request) => {
    request.resume()
    request.on('end', () => {
      request.socket.destroy()
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve()
    })
  })

  const { port } = server.address() as AddressInfo
  const serverUrl = `http://127.0.0.1:${port}/`
  unresponsiveServers.set(serverUrl, server)

  return serverUrl
}

const stopUnresponsiveServer: BrowserCommand<[serverUrl: string]> = async (
  _context,
  serverUrl,
) => {
  const server = unresponsiveServers.get(serverUrl)
  unresponsiveServers.delete(serverUrl)

  if (server == null) {
    return
  }

  server.closeAllConnections()
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
}

interface HeapSnapshot {
  snapshot: {
    meta: {
      node_fields: Array<string>
      node_types: Array<Array<string>>
    }
    node_count: number
  }
  nodes: Array<number>
  strings: Array<string>
}

function countConstructor(
  snapshot: HeapSnapshot,
  constructorName: string,
): number {
  const { meta, node_count: nodeCount } = snapshot.snapshot
  const fieldCount = meta.node_fields.length
  const typeFieldIndex = meta.node_fields.indexOf('type')
  const nameFieldIndex = meta.node_fields.indexOf('name')
  const objectTypeIndex = meta.node_types[0].indexOf('object')
  let count = 0

  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const base = nodeIndex * fieldCount

    if (snapshot.nodes[base + typeFieldIndex] !== objectTypeIndex) {
      continue
    }

    if (
      snapshot.strings[snapshot.nodes[base + nameFieldIndex]] ===
      constructorName
    ) {
      count++
    }
  }

  return count
}

const countHeapObjects: BrowserCommand<
  [constructorName: string],
  number
> = async ({ page }, constructorName) => {
  const session = await page.context().newCDPSession(page)

  try {
    await session.send('HeapProfiler.enable')
    await session.send('HeapProfiler.collectGarbage')

    const chunks: Array<string> = []
    const handleChunk = (event: { chunk: string }) => {
      chunks.push(event.chunk)
    }

    session.on('HeapProfiler.addHeapSnapshotChunk', handleChunk)
    await session.send('HeapProfiler.takeHeapSnapshot', {
      reportProgress: false,
    })
    session.off('HeapProfiler.addHeapSnapshotChunk', handleChunk)

    const snapshot = JSON.parse(chunks.join('')) as HeapSnapshot
    return countConstructor(snapshot, constructorName)
  } finally {
    await session.detach()
  }
}

export const browserCommands = {
  startUnresponsiveServer,
  stopUnresponsiveServer,
  countHeapObjects,
}
