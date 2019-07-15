module.exports = function() {
  this.registerHandler('BeforeScenario', function(scenario, callback) {
    console.log('before scenario event!')
    console.log('this:', this)
    callback()
  })
}
