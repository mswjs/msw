const { MSW } = MockServiceWorker

const msw = new MSW()

msw.get('https://github.com/user/:username', (req, res) => {
  console.log({req})
  res
    .status(301, 'Custom status text')
    .set({
      'Header-One': 'first',
      'Header-Two': 'second',
    })
    .json({
      ...req.params,
      message: `This is not a GitHub API, but it may be.`,
      param: 'value'
    })
})

msw.post('https://github.com/repo/:repoName', (req, res) => {
  res
    .set('Custom-Header', 'value')
    .json({
      repository: req.params.repoName,
      message: 'This repo is amazing'
    })
})

msw.post('https://api.website.com', (req, res) => {
  res
    .delay(2000)
    .json({ message: 'Delayed response' })
})

msw.start()

/* --- Code below is irrelevant to MSW */

document.getElementById('btn').addEventListener('click', () => {
  fetch('https://github.com/user/kettanaito', {
    mode: 'no-cors',
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
        "Content-Type": "application/json; charset=utf-8",
    },
  })
})

document.getElementById('btn-02').addEventListener('click', () => {
  fetch('https://api.website.com', { method: 'POST' })
})
