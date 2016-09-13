# Raptor RPC

Raptor RPC is a transport-agnostic RPC server with middleware support and an
easy to use api. It will allow you to have a server up and running in a matter
of minutes, without limiting you to a specific transport.

It works out of the box with the standard transports provided by Node.js and
also with some popular frameworks.

## Installation

```sh
npm install --save raptor-rpc
```

## Usage

```js
const Raptor = require('raptor-rpc')
const raptor = new Raptor()

raptor.method('ping', function (req, cb) {
  cb(null, 'pong')
})

raptor.serve('http', 1337)
```

## API

### Raptor

#### `.use(fn)`

Add middleware to the server.

 - `fn`: Middleware function that takes `req` and `cb`

#### `.method(name, fn)`

Register a method with the server.

 - `name`: The method name
 - `fn`: Method function, takes `req` and `cb`

#### `.handle(...)`

Handle a request, accepts a number of different parameters.

Read more under `Transports`.

#### `.attach(server)`

Attaches Raptor to the server, accepts a number of different parameters.

Read more under `Transports`.

#### `.serve(type, port)`

Starts a server and accepts connections.

 - `type`: Which transport to use (`dgram`, `http`, `net`)
 - `port`: Which port to listen to

Returns the server instance (`dgram.Socket`, `http.Server` or `net.Server`).

### Request

#### `.id`

The jsonrpc id of the request, can be `undefined`. This variable is read-only.

#### `.method`

The method name of the request. This variable is read-only.

#### `.params`

The params object as passed from the client. Can be `Array` or `Object`.

#### `.param(key, defValue)`

Helper function to get a parameter or a default value if it wasn't provided.

 - `key`: Key to fetch, can be `Number` or `String`
 - `defValue`: Value to return if `key` wasn't provided, is `undefined` if not specified.

#### `.require(key, type)`

Helper function to require the presence a parameter and optionally check it's
type. Will send an `Invalid params` error (-32602) back to the client, and stop
execution, if the parameter is not present. It also returns the value of the
parameter.

 - `key`: Key to require, can be `Number` or `String`
 - `type`: If specified, also require the parameter to be of this type

Valid values for `type` is specified in the
[JSON Schema: core definitions and terminology](http://json-schema.org/latest/json-schema-core.html#anchor8)
and [RFC 4627](http://tools.ietf.org/html/rfc4627).

> This is implemented with `try` and `catch` so currently it only works inside
> the main function, not in any asynchronous function. This could be fixed with
> `domain` in the future.

#### `.source`

The source of the connection, i.e. the stream that was piped to the connection.

#### `.remote`

Info about the other end of the connection. Includes three keys:

 - `type`: Type of the transport (`unknown`, `dgram`, `http`, `net`)
 - `address`: Ip address of the remote
 - `port`: The remote port

## Error handling

If you pass an error to the provided callback in middleware or method, that
error will be sent back to the client. The description will be `err.toString()`
and the code `err.rpcCode`. If `rpcCode` is undefined the code sent will be 0.

You can also include additional data by providing `err.rpcData`. `rpcData` can
be of any type.

## Transports

### Express

```js
const app = express()
const raptor = new Raptor()

app.use('/api', raptor.handle)
app.listen(1337)
```

### Dgram

```js
const raptor = new Raptor()
const socket = dgram.createSocket('udp4')

raptor.attach(socket);
socket.bind(1337);
```

### Net

```js
const raptor = new Raptor()
const server = net.createServer({ allowHalfOpen: true })

raptor.attach(server);
server.listen(1337);
```

### Http

```js
const raptor = new Raptor()
const server = http.createServer()

raptor.attach(server);
server.listen(1337);
```

## License

```text
Copyright (c) 2014 Linus Unnebäck
Licensed under the MIT License (MIT)
```
