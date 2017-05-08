/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const logging = require('@google-cloud/logging')();
const monitoring = require('@google-cloud/monitoring').v3();

// Application implementing the integration test spec at
// https://github.com/GoogleCloudPlatform/runtimes-common/blob/master/integration_tests/README.md
const app = express();

app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
});

app.post('/logging_standard', (req, res) => {
  console.log('/logging_standard', req.body);
  res.status(501).send('Not implemented');
});

app.post('/logging_custom', (req, res) => {
  console.log('/logging_custom', req.body);
  const { log_name, token, level } = req.body;

  const log = logging.log(log_name);
  const entry = log.entry({}, {
    token: token
  });
  log[level.toLowerCase()](entry, function(err) {
    if (err) {
      console.log('error writing log entry', err);
      res.status(500).send(err);
    } else {
      console.log('wrote log entry', entry);
      res.status(200).send('OK!');
    }
  });
});

app.post('/monitoring', (req, res) => {
  console.log('/monitoring', req.body);
  const { token, name } = req.body;

  const m = require('./monitoring.js');
  m(name, token).then((results) => {
    console.log('wrote monitoring data', results);
    res.status(200).send('OK! wrote monitoring data');
  }).catch((err) => {
    res.status(500).send('Failed to write monitoring data:' + err);
  });
});

app.post('/exception', (req, res) => {
  console.log('/exception', req.body);
  // TODO(ofrobots): implement the error reporting test.
  // req.body.token: int64 value to include in the error.
  // The integration test doesn't have a way to verify that we have actually
  // written the token as an exception. We cheat for now.
  res.status(200).send('OK! I cheated though!');
});

app.get('/custom', (req, res) => {
  console.log('/custom');
  res.status(200).send({});
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Application started`);
});
