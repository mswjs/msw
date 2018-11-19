const { msw } = MockServiceWorker

msw.get(
  'https://github.com/user/:username',
  (req, res, { status, set, json }) => {
    return res(
      status(301, 'Custom status text'),
      set({
        'Header-One': 'foo',
        'Header-Two': 'bar',
      }),
      json({
        message: 'This is not a GitHub API',
        username: req.params.username,
      }),
    )
  },
)

msw.post('https://github.com/repo/:repoName', (req, res, { set, json }) => {
  return res(
    set('Custom-Header', 'value'),
    json({
      repository: req.params.repoName,
      message: 'This repo is amazing',
    }),
  )
})

msw.get(/api.website/, (req, res, { json }) => {
  return res(json({ message: 'Mocked using RegExp!' }))
})

msw.post('https://api.website.com', (req, res, { json, delay }) => {
  return res(delay(2000), json({ message: 'Delayed response message' }))
})

msw.start()

/* --- Code below is irrelevant to MSW */

document.getElementById('btn').addEventListener('click', () => {
  fetch('https://github.com/user/kettanaito', {
    mode: 'no-cors',
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
})

document.getElementById('btn-02').addEventListener('click', () => {
  fetch('https://api.website.com', { method: 'POST' })
})

document.getElementById('btn-03').addEventListener('click', () => {
  fetch('https://api.website.com')
})
