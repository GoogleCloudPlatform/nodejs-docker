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

const INVALID_APP_YAML_CONTENTS = 'runtime: \'nodejs'
    //         ^
    //         +-- This is intentionally unclosed

    interface TestConfig {
  title: string;
  locations: Location[];
  expectedLogs: string[];
  expectedErrors: string[];
  expectedResult: Setup|undefined;
  expectedThrownErrMessage?: RegExp;
  env?: {[key: string]: string};
}

describe('detectSetup', () => {
  function performTest(testConfig: TestConfig) {
    it(testConfig.title, async () => {
      const backupEnv = Object.assign({}, process.env);
      if (testConfig.env) {
        for (let key in testConfig.env) {
          process.env[key] = testConfig.env[key];
        }
      }

      const logger = new MockLogger();
      const fsview = new MockView(testConfig.locations);

      let setup;
      try {
        setup = await detectSetup(logger, fsview);
      } catch (e) {
        if (testConfig.expectedThrownErrMessage) {
          assert(
              testConfig.expectedThrownErrMessage.test(e.message),
              '"' + e.message + '" does not match "' +
                  testConfig.expectedThrownErrMessage + '"');
        } else {
          assert.ok(!e, `Unexpected error thrown: ${e.message}`);
        }
      }
      assert.deepStrictEqual(setup, testConfig.expectedResult);

      assert.deepStrictEqual(logger.logs, testConfig.expectedLogs);
      assert.deepStrictEqual(logger.errors, testConfig.expectedErrors);

      if (testConfig.env) {
        for (let key in testConfig.env) {
          delete process.env[key];
          if (backupEnv[key]) {
            process.env[key] = backupEnv[key];
          }
        }
      }
    });
  }

  describe('should fail correctly', () => {
    performTest({
      title: 'should fail without app.yaml',
      locations: [{path: 'app.yaml', exists: false}],
      expectedLogs: [],
      expectedErrors: [],
      expectedResult: undefined,
      expectedThrownErrMessage: /The file app.yaml does not exist/
    });

    performTest({
      title: 'should fail with an invalid app.yaml',
      locations: [
        {path: 'app.yaml', exists: true, contents: INVALID_APP_YAML_CONTENTS}
      ],
      expectedLogs: [],
      expectedErrors: [],
      expectedResult: undefined,
      expectedThrownErrMessage:
          /unexpected end of the stream within a single quoted scalar.*/
    });

    performTest({
      title: 'should fail with app.yaml but without package.json or server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: false}
      ],
      expectedLogs:
          ['Checking for Node.js.', 'node.js checker: No package.json file.'],
      expectedErrors: [],
      expectedResult: undefined,
      expectedThrownErrMessage: new RegExp(
          'node.js checker: Neither "start" in the ' +
          '"scripts" section of "package.json" nor ' +
          'the "server.js" file were found.')
    });
  });

  describe('should detect correctly', () => {
    performTest({
      title: 'should detect without package.json and with server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: true, contents: 'some content'}
      ],
      expectedLogs:
          ['Checking for Node.js.', 'node.js checker: No package.json file.'],
      expectedErrors: [],
      expectedResult: {canInstallDeps: false, useYarn: false}
    });

    performTest({
      title: 'should detect with package.json, without yarn.lock, and with ' +
          'server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: false}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: false}
    });

    performTest({
      title:
          'should detect with package.json, with yarn.lock, with yarn.lock ' +
          'skipped, and with server.js',
      locations: [
        {
          path: 'app.yaml',
          exists: true,
          contents: VALID_APP_YAML_CONTENTS_SKIP_YARN
        },
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some contents'}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: false}
    });

    performTest({
      title: 'should detect with package.json, without a start script, ' +
          'with yarn.lock, and with server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some content'}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: true}
    });

    performTest({
      title: 'should detect with package.json, without yarn.lock, ' +
          'and with server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: false}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: false}
    });

    performTest({
      title:
          'should detect with package.json, with yarn.lock, with yarn.lock ' +
          'skipped, and without server.js',
      locations: [
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
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: false}
    });

    performTest({
      title: 'should detect with package.json, with yarn.lock, and without ' +
          'server.js',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some content'}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: true}
    });

    performTest({
      title: 'should use a custom app.yaml path if specified',
      locations: [
        {path: 'app.yaml', exists: true, contents: INVALID_APP_YAML_CONTENTS},
        {path: 'custom.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some content'}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: true},
      env: {GAE_APPLICATION_YAML_PATH: 'custom.yaml'}
    });

    performTest({
      title: 'should not use a custom app.yaml path if not specified',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'node.yaml', exists: true, contents: INVALID_APP_YAML_CONTENTS},
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some content'}
      ],
      expectedLogs: ['Checking for Node.js.'],
      expectedErrors: [
        'node.js checker: ignoring invalid "engines" field in package.json',
        'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
      ],
      expectedResult: {canInstallDeps: true, useYarn: true}
    });
  });
});
