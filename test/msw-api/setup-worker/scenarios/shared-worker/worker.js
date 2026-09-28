onconnect = (event) => {
  const port = event.ports[0]

  port.onmessage = (event) => {
    port.postMessage(`hello, ${event.data}`)
  }
}
