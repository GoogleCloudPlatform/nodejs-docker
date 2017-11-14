'use strict';

var http = require('http');
var packageJson = require('./package.json');

var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end(
    JSON.stringify({
      stdout: packageJson.scripts['gcp-build'],
      stderr: ''
    }));
}).listen(process.env.PORT || 8080);

