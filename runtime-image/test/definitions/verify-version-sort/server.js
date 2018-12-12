'use strict';
var http = require('http');
var child_process = require('child_process');
var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end(process.version);
}).listen(8080);