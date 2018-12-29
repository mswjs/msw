const path = require('path')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './index.html'))
})

app.use(express.static(path.resolve(__dirname, './')))

app.listen(8090, () => {
  console.log('Server established at http://localhost:8090')
})
