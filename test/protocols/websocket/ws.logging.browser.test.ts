import { ws } from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

test('does not log anything if there are no matching event handlers', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url().href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    // Create an event handler that doesn't match the WebSocket connection.
    const api = ws.link('wss://localhost/one')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate((serverUrl) => {
    const ws = new WebSocket(serverUrl)

    return new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.close()
        resolve()
      }
      ws.onerror = () => reject(new Error('Client connection errored'))
    })
  }, serverUrl)

  expect(consoleSpy.get('startGroupCollapsed')).not.toEqual(
    expect.arrayContaining([expect.stringContaining(serverUrl)]),
  )
})

test('logs the open event', async ({ network, page, spyOnConsole }) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    new WebSocket('wss://localhost/path')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2} %c▶%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the client', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.close()
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the original server', async ({
  network,
  spyOnConsole,
  page,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?close=1003').href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c ws:\/\/(.+):\d{4,}\/ color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs the close event initiated by the event handler', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(
      api.addEventListener('connection', ({ client }) => {
        client.close()
      }),
    )
  })

  await page.evaluate(() => {
    new WebSocket('wss://localhost/path')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c■%c wss:\/\/localhost\/path color:#3b82f6 color:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending text', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send('hello world')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c hello world %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long text', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send('this is an extremely long sentence to log out')
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c this is an extremely lon… %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending Blob', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send(new Blob(['hello world']))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c Blob\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long Blob', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () =>
      ws.send(new Blob(['this is an extremely long sentence to log out']))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c Blob\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending ArrayBuffer data', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () => ws.send(new TextEncoder().encode('hello world'))
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c ArrayBuffer\(hello world\) %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs outgoing client message sending long ArrayBuffer', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(async () => {
    const api = ws.link('wss://localhost/*')
    network.use(api.addEventListener('connection', () => {}))
  })

  await page.evaluate(() => {
    const ws = new WebSocket('wss://localhost/path')
    ws.onopen = () =>
      ws.send(
        new TextEncoder().encode(
          'this is an extremely long sentence to log out',
        ),
      )
  })

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c ArrayBuffer\(this is an extremely lon…\) %c45%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs incoming server messages', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?conversation').href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ client, server }) => {
        server.connect()
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    const ws = new WebSocket(url)
    ws.addEventListener('message', (event) => {
      if (event.data === 'hello from server') {
        ws.send('how are you, server?')
      }
    })
  }, serverUrl)

  // Initial message sent to every connected client.
  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )

  // Message sent in response to a client message.
  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c thanks, not bad %c15%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs raw incoming server events', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ client, server }) => {
        server.connect()

        server.addEventListener('message', (event) => {
          event.preventDefault()
          // This is the only data the client will receive
          // but we should still print the raw server message.
          client.send('intercepted server event')
        })
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        // The actual (raw) message received from the server.
        // The arrow is dotted because the message's default has been prevented.
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),

        // The mocked message sent from the event handler (client.send()).
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c intercepted server event %c24%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs mocked outgoing client message (server.send)', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url().href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
        server.send('hello from handler')
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬆%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('logs mocked incoming server message (client.send)', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url().href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ client }) => {
        client.send('hello from handler')
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⬇%c hello from handler %c18%c color:#ff6a33 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('marks the prevented outgoing client event as dashed', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url().href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          event.preventDefault()
        })
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    const socket = new WebSocket(url)
    socket.onopen = () => socket.send('hello world')
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇡%c hello world %c11%c color:#22c55e color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})

test('marks the prevented incoming server event as dashed', async ({
  network,
  page,
  spyOnConsole,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const consoleSpy = spyOnConsole()
  await page.evaluate(async (url) => {
    const api = ws.link(url)
    network.use(
      api.addEventListener('connection', ({ server }) => {
        server.connect()
        server.addEventListener('message', (event) => {
          event.preventDefault()
        })
      }),
    )
  }, serverUrl)

  await page.evaluate((url) => {
    new WebSocket(url)
  }, serverUrl)

  await expect
    .poll(() => consoleSpy.get('raw')!.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\[MSW\] \d{2}:\d{2}:\d{2}\.\d{3} %c⇣%c hello from server %c17%c color:#ef4444 color:inherit color:gray;font-weight:normal color:inherit;font-weight:inherit$/,
        ),
      ]),
    )
})
