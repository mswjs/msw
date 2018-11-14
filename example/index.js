const { MSW } = MockServiceWorker

const msw = new MSW()
window.msw = msw

msw.get('https://github.com/user/:username', (req) => {
  return {
    ...req.params,
    hey: `This is mocked. This is not the GitHub API.`
  }
})

document.getElementById('btn').addEventListener('click', () => {
  fetch('https://github.com/user/kettanaito')
})
