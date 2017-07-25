'use strict';
var http = require('http');
var child_process = require('child_process');
var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  child_process.exec('/app/run.sh', function(err, stdout) {
    if (err) {
      console.log(err);
      return response.end(err);
    }
    response.end(stdout.trim());
  });
}).listen(8080);