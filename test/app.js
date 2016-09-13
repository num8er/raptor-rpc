/* eslint-env mocha */

var helper = require('./_helper')

describe('app', function () {
  var app = helper.app()
  var ee = helper.calls()

  ee.on('request', function (buf) {
    app.handleBuffer(buf, function (err, obj) {
      if (err) {
        ee.emit('error', err)
      } else {
        var b = new Buffer(JSON.stringify(obj))
        ee.emit('remote', { type: 'unknown', port: undefined })
        ee.emit('response', b)
      }
    })
  })

  ee.registerTests()
})
