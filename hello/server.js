var express = require('express');
var app = express();

app.get('/', function(req, res) {
  res.send('Hello World');
});

var server = app.listen(8080, function() {
    console.log('Listening on port %d', server.address().port);
});
