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

import * as assert from 'assert';

import {detectSetup, Setup} from '../src/detect_setup';

import {Location, MockLogger, MockView} from './common';

const VALID_APP_YAML_CONTENTS = `# A comment
runtime: node.js
env: flex
service: some-service
`;

const VALID_APP_YAML_CONTENTS_SKIP_YARN =
    VALID_APP_YAML_CONTENTS + `skip_files:
- ^(.*/)?\.bak$
- ^yarn\.lock$
`;

describe('detectSetup', () => {
  function performTest(
      title: string, locations: Location[], expectedLogs: string[],
      expectedErrors: string[], expectedResult: Setup|undefined,
      expectedThrownErrMessage?: RegExp) {
    it(title, async () => {
      const logger = new MockLogger();
      const fsview = new MockView(locations);

      let setup;
      try {
        setup = await detectSetup(logger, fsview);
      } catch (e) {
        if (expectedThrownErrMessage) {
          assert(
              expectedThrownErrMessage.test(e.message),
              '"' + e.message + '" does not match "' +
                  expectedThrownErrMessage + '"');
        } else {
          assert.ok(!e, `Unexpected error thrown: ${e.message}`);
        }
      }
      assert.deepStrictEqual(setup, expectedResult);

      assert.deepStrictEqual(logger.logs, expectedLogs);
      assert.deepStrictEqual(logger.errors, expectedErrors);
    });
  }

  describe('should fail correctly', () => {
    performTest(
        'should fail without app.yaml', [{path: 'app.yaml', exists: false}], [],
        [], undefined, /The file app.yaml does not exist/);

    performTest(
        'should fail with an invalid app.yaml', [{
          path: 'app.yaml',
          exists: true,
          contents: 'runtime: \'nodejs'
          //                  ^
          //                  +-- This is intentionally unclosed
        }],
        [], [], undefined,
        /unexpected end of the stream within a single quoted scalar.*/);

    performTest(
        'should fail with app.yaml but without package.json or server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
          {path: 'package.json', exists: false},
          {path: 'server.js', exists: false}
        ],
        ['Checking for Node.js.', 'node.js checker: No package.json file.'], [],
        undefined,
        new RegExp(
            'node.js checker: Neither "start" in the ' +
            '"scripts" section of "package.json" nor ' +
            'the "server.js" file were found.'));
  });

  describe('should detect correctly', () => {
    performTest(
        'should detect without package.json and with server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
          {path: 'package.json', exists: false},
          {path: 'server.js', exists: true, contents: 'some content'}
        ],
        ['Checking for Node.js.', 'node.js checker: No package.json file.'], [],
        {canInstallDeps: false, useYarn: false});

    performTest(
        'should detect with package.json, without yarn.lock, and with ' +
            'server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
          {path: 'package.json', exists: true, contents: '{}'},
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: false}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: false});

    performTest(
        'should detect with package.json, with yarn.lock, with yarn.lock ' +
            'skipped, and with server.js',
        [
          {
            path: 'app.yaml',
            exists: true,
            contents: VALID_APP_YAML_CONTENTS_SKIP_YARN
          },
          {path: 'package.json', exists: true, contents: '{}'},
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: true, contents: 'some contents'}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: false});

    performTest(
        'should detect with package.json, without a start script, ' +
            'with yarn.lock, and with server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
          {path: 'package.json', exists: true, contents: '{}'},
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: true, contents: 'some content'}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: true});

    performTest(
        'should detect with package.json, without yarn.lock, ' +
            'and with server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
            path: 'package.json',
            exists: true,
            contents: JSON.stringify({scripts: {start: 'npm start'}})
          },
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: false}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: false});

    performTest(
        'should detect with package.json, with yarn.lock, with yarn.lock ' +
            'skipped, and without server.js',
        [
          {
            path: 'app.yaml',
            exists: true,
            contents: VALID_APP_YAML_CONTENTS_SKIP_YARN
          },
          {
            path: 'package.json',
            exists: true,
            contents: JSON.stringify({scripts: {start: 'npm start'}})
          },
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: true, contents: 'some contents'}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: false});

    performTest(
        'should detect with package.json, with yarn.lock, and without ' +
            'server.js',
        [
          {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
            path: 'package.json',
            exists: true,
            contents: JSON.stringify({scripts: {start: 'npm start'}})
          },
          {path: 'server.js', exists: true, contents: 'some content'},
          {path: 'yarn.lock', exists: true, contents: 'some content'}
        ],
        ['Checking for Node.js.'],
        [
          'node.js checker: ignoring invalid "engines" field in package.json',
          'No node version specified.  Please add your node ' +
              'version, see ' +
              'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
        ],
        {canInstallDeps: true, useYarn: true});
  });
});
