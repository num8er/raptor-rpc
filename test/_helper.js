/* eslint-env mocha */

var Raptor = require('../')

var assert = require('assert')
var EventEmitter = require('events').EventEmitter

exports.app = function () {
  var app = new Raptor()

  app.method('ping', function (req) {
    return 'pong'
  })

  app.method('remote', function (req) {
    return req.remote
  })

  app.method('require-name', function (req) {
    req.require('name', 'string')
    return req.param('name')
  })

  app.method('require-array', function (req) {
    req.require('names', 'array')
    return req.param('names')
  })

  app.method('set-timeout', function (req) {
    req.require('ms', 'integer')

    return new Promise(function (resolve) {
      setTimeout(resolve, req.param('ms'), 'pong')
    })
  })

  app.method('require-return', function (req) {
    return req.require('value', 'string')
  })

  app.method('throw', function (req) {
    var err = new Error('Test')
    err.rpcCode = 1337
    err.rpcData = { a: 1 }
    throw err
  })

  return app
}

exports.calls = function () {
  var id = 0
  var map = {}
  var ee = new EventEmitter()
  var sm = function (test, done) {
    var i = ++id
    map[i] = function (obj) {
      test[2](obj)
      done()
    }
    var b = new Buffer(JSON.stringify({
      jsonrpc: '2.0',
      id: i,
      method: test[0],
      params: test[1]
    }))

    ee.emit('request', b)
  }
  var smm = function (arr, done) {
    var left = arr.length
    var b = new Buffer(JSON.stringify(arr.map(function (e) {
      var i = ++id
      map[i] = function (obj) {
        e[2](obj)
        if (--left === 0) {
          done()
        }
      }

      return {
        jsonrpc: '2.0',
        id: i,
        method: e[0],
        params: e[1]
      }
    })))

    ee.emit('request', b)
  }

  ee.on('response', function (buf) {
    var obj = JSON.parse(buf.toString())

    if (!Array.isArray(obj)) {
      obj = [obj]
    }

    obj.forEach(function (obj) {
      map[obj.id](obj)
      delete map[obj.id]
    })
  })

  var remote = null
  ee.on('remote', function (r) {
    remote = r
  })

  ee.registerTests = function () {
    var tests = [
      ['ping', 123, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32600)
        assert.equal(obj.error.message, 'Invalid Request')
      }],

      ['djaksl', undefined, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32601)
        assert.equal(obj.error.message, 'Method not found')
      }],

      ['ping', undefined, function (obj) {
        assert.equal(obj.result, 'pong')
      }],

      ['set-timeout', { ms: 5 }, function (obj) {
        assert.equal(obj.result, 'pong')
      }],

      ['remote', undefined, function (obj) {
        assert.equal(obj.result.type, remote.type)
        assert.equal(obj.result.port, remote.port)
      }],

      ['require-name', undefined, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32602)
        assert.equal(obj.error.message, 'InvalidParams: Missing required param name')
      }],

      ['require-name', { name: 1337 }, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32602)
        assert.equal(obj.error.message, 'InvalidParams: Param name should be of type string')
      }],

      ['require-name', { name: 'linus' }, function (obj) {
        assert.equal(obj.result, 'linus')
      }],

      ['require-array', undefined, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32602)
        assert.equal(obj.error.message, 'InvalidParams: Missing required param names')
      }],

      ['require-array', { names: { a: 1 } }, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, -32602)
        assert.equal(obj.error.message, 'InvalidParams: Param names should be of type array')
      }],

      ['require-array', { names: ['linus', 'steve'] }, function (obj) {
        assert(Array.isArray(obj.result))
        assert.equal(obj.result[0], 'linus')
        assert.equal(obj.result[1], 'steve')
      }],

      ['require-return', { value: 'ABC' }, function (obj) {
        assert.equal(obj.result, 'ABC')
      }],

      ['throw', {}, function (obj) {
        assert(obj.error)
        assert.equal(obj.error.code, 1337)
        assert.equal(obj.error.message, 'Error: Test')
        assert.deepEqual(obj.error.data, { a: 1 })
      }]
    ]

    tests.forEach(function (test, idx) {
      it('should handle ' + test[0], function (done) {
        sm(test, done)
      })
    })

    it('should accept multiple requests', function (done) {
      smm(tests, done)
    })
  }

  return ee
}
