const { MSW } = MockServiceWorker

const msw = new MSW()

msw.get('https://github.com/user/:username', (req, res) => {
  res.status(402, 'Custom status text').json({
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

document.getElementById('btn').addEventListener('click', () => {
  fetch('https://github.com/user/kettanaito')
})

document.getElementById('btn-02').addEventListener('click', () => {
  fetch('https://github.com/repo/msw', { method: 'POST' })
})

msw.start()
