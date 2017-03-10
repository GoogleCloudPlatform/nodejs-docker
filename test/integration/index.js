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
const logging = require('@google-cloud/logging');

// Application implementing the integration test spec at
// https://github.com/GoogleCloudPlatform/runtimes-common/blob/master/integration_tests/README.md
const app = express();

app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
});

app.post('/logging', (req, res) => {
  console.log('/logging', req.body);
  // TODO(ofrobots): implement the logging test.
  // req.body.log_name: the name of the log to write to.
  // req.body.token: int64 the token to write.
  res.status(501).send(http.STATUS_CODES[501]);
});

app.post('/monitoring', (req, res) => {
  console.log('/monitoring', req.body);
  // TODO(ofrobots): implement the monitoring test.
  // req.body.name: name of the metric to write.
  // req.body.token: int64 metric value.
  res.status(501).send(http.STATUS_CODES[501]);
});

app.post('/exception', (req, res) => {
  console.log('/monitoring', req.body);
  // TODO(ofrobots): implement the error reporting test.
  // req.body.token: int64 value to include in the error.
  res.status(501).send(http.STATUS_CODES[501]);
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Application started`);
});