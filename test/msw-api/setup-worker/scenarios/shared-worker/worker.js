onconnect = (event) => {
  const port = event.ports[0]

  port.onmessage = (e) =>
    port.postMessage(e.data.replace('posted to', 'received from'))
}
