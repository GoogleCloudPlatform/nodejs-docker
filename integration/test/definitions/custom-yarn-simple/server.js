'use strict';

var http = require('http');
var child_process = require('child_process');

var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  child_process.exec('yarn --version', {
    encoding: 'utf8'
  }, function(err, stdout, stderr) {
    if (err) {
      throw err;
    }
    response.end(stdout + stderr);
  });
}).listen(process.env.PORT || 8080);
