// Generates an HTML of the page served by the testing server.
module.exports = ({ libPath, mockDef }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Test scenario</title>
  </head>
  <body>
    <script src="${libPath}"></script>

    <!-- Mocking definition --> 
    <script>${mockDef}</script>
  </body>
</html>
`
