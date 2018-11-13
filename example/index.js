const { MSW } = MockServiceWorker

const msw = new MSW()
window.msw = msw

msw.get('https://github.com/user/kettanaito', (req) => {
  return { hey: 'This is mocked. No way this is GitHub API.' }
})

document.getElementById('btn').addEventListener('click', () => {
  fetch('https://github.com/user/kettanaito')
})
