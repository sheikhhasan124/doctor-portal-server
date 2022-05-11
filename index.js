const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello Home')
})

app.listen(port, () => {
  console.log(`server are running at ${port}`)
})