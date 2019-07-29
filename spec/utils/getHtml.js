// Generates an HTML of the page served by the testing server.
module.exports = ({ libPath, mockDef }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Test scenario</title>
  </head>
  <body>
    <h1>MockServiceWorker</h1>
    <p>A test is currently in progress, please remain patient.</p>

    <script src="${libPath}"></script>
    <script>${mockDef}</script>
  </body>
</html>
`
