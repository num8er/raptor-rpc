
var net = require('net');
var http = require('http');
var dgram = require('dgram');
var events = require('events');

function serve(raptor, type, port) {
  var server;

  switch (type) {
  case 'dgram':
    server = dgram.createSocket('udp4');
    server.bind(port);
    break;
  case 'http':
    server = http.createServer();
    server.listen(port);
    break;
  case 'net':
    server = net.createServer({ allowHalfOpen: true });
    server.listen(port);
    break;
  default:
    throw new Error('Unknown type: ' + type);
  }

  raptor.attach(server);
  return server;
}

function handle(raptor, a0, a1) {

  if (
    a0 instanceof http.IncomingMessage &&
    a1 instanceof http.ServerResponse
  ) {
    // Express or Connect might
    // already have parsed the body
    if (a0.body) {
      raptor.connection().handleObject(a0.body, function (err, res) {
        if (err) {
          raptor.emit(err);
        } else {
          var b = new Buffer(JSON.stringify(res));
          a1.setHeader('Content-Length', b.length);
          a1.setHeader('Content-Type', 'application/json; charset=utf-8');
          a1.end(b);
        }
      });
    } else {
      a1.setHeader('Content-Type', 'application/json; charset=utf-8');
      a0.pipe(raptor.connection()).pipe(a1);
    }

    return ;
  }

  if (a0 instanceof net.Socket) {
    a0.pipe(raptor.connection()).pipe(a0);

    return ;
  }

  raptor.emit(new Error('Unable to handle'));
}

function attach(raptor, server) {

  if (server instanceof http.Server) {
    server.on('request', raptor.handle);

    return ;
  }

  if (server instanceof net.Server) {
    server.on('connection', raptor.handle);

    return ;
  }

  if (server instanceof dgram.Socket) {
    server.on('message', function (msg, rinfo) {
      raptor.connection().handleBuffer(msg, function (err, res) {
        if (err) {
          raptor.emit('error', err);
        } else {
          var b = new Buffer(JSON.stringify(res));
          server.send(b, 0, b.length, rinfo.port, rinfo.address);
        }
      });
    });

    return ;
  }

  raptor.emit(new Error('Unable to attach'));
}

module.exports = function (raptor) {
  return {
    serve: function (type, port) { serve(raptor, type, port); },
    handle: function (a0, a1) { handle(raptor, a0, a1); },
    attach: function (server) { attach(raptor, server); }
  };
};