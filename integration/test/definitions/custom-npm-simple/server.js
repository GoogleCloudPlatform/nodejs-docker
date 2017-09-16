'use strict';

var http = require('http');
var child_process = require('child_process');

var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  child_process.exec('npm --version', {
    encoding: 'utf8'
  }, function(err, stdout, stderr) {
    if (err) {
      throw err;
    }
    response.end(JSON.stringify({
      stdout: stdout,
      stderr: stderr
    }));
  });
}).listen(process.env.PORT || 8080);
