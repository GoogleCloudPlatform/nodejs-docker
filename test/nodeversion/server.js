'use strict';
var http = require('http');
var server = http.createServer((request, response) => {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end(process.version);
}).listen(3000);