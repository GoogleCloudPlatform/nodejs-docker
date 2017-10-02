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

const DEFAULT_APP_YAML = 'app.yaml';

const SERVER_JS_CONTENTS = 'echo(\'Hello world\')';

interface TestConfig {
  title: string;
  locations: Location[];
  // This type is `Setup|undefined` instead of being optional because the
  // expected result is always required to ensure tests are checking the
  // return value from the setup detection.  A value of `undefined`
  // indicates that the setup detection didn't return a value (For example,
  // it failed with an exception thrown).
  expectedResult: Setup|undefined;
  expectedLogs?: string[];
  expectedErrors?: string[];
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

      if (testConfig.expectedLogs) {
        assert.deepStrictEqual(logger.logs, testConfig.expectedLogs);
      }

      if (testConfig.expectedErrors) {
        assert.deepStrictEqual(logger.errors, testConfig.expectedErrors);
      }

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
        {path: 'server.js', exists: false}, {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
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

  describe(
      'should be consistent with deploys not using the runtime builder', () => {
        performTest({
          title: 'should detect without package.json and with server.js',
          locations: [
            {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
            {path: 'package.json', exists: false},
            {path: 'server.js', exists: true, contents: 'some content'},
            {path: 'yarn.lock', exists: false},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: [
            'Checking for Node.js.', 'node.js checker: No package.json file.'
          ],
          expectedErrors: [],
          expectedResult: {
            canInstallDeps: false,
            useYarn: false,
            appYamlPath: DEFAULT_APP_YAML
          }
        });

        performTest({
          title:
              'should detect with package.json, without yarn.lock, and with ' +
              'server.js',
          locations: [
            {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
            {path: 'package.json', exists: true, contents: '{}'},
            {path: 'server.js', exists: true, contents: 'some content'},
            {path: 'yarn.lock', exists: false},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: false,
            appYamlPath: DEFAULT_APP_YAML
          }
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
            {path: 'yarn.lock', exists: true, contents: 'some contents'},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: false,
            appYamlPath: DEFAULT_APP_YAML
          }
        });

        performTest({
          title: 'should detect with package.json, without a start script, ' +
              'with yarn.lock, and with server.js',
          locations: [
            {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
            {path: 'package.json', exists: true, contents: '{}'},
            {path: 'server.js', exists: true, contents: 'some content'},
            {path: 'yarn.lock', exists: true, contents: 'some content'},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: true,
            appYamlPath: DEFAULT_APP_YAML
          }
        });

        performTest({
          title: 'should detect with package.json, without yarn.lock, ' +
              'and with server.js',
          locations: [
            {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
            {
              path: 'package.json',
              exists: true,
              contents: JSON.stringify({scripts: {start: 'npm start'}})
            },
            {path: 'server.js', exists: true, contents: 'some content'},
            {path: 'yarn.lock', exists: false},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: false,
            appYamlPath: DEFAULT_APP_YAML
          }
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
            {path: 'yarn.lock', exists: true, contents: 'some contents'},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: false,
            appYamlPath: DEFAULT_APP_YAML
          }
        });

        performTest({
          title:
              'should detect with package.json, with yarn.lock, and without ' +
              'server.js',
          locations: [
            {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
            {
              path: 'package.json',
              exists: true,
              contents: JSON.stringify({scripts: {start: 'npm start'}})
            },
            {path: 'server.js', exists: true, contents: 'some content'},
            {path: 'yarn.lock', exists: true, contents: 'some content'},
            {path: 'package-lock.json', exists: false}
          ],
          expectedLogs: ['Checking for Node.js.'],
          expectedErrors: [
            'No node version specified.  Please add your node ' +
            'version, see ' +
            'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime'
          ],
          expectedResult: {
            canInstallDeps: true,
            useYarn: true,
            appYamlPath: DEFAULT_APP_YAML
          }
        });
      });

  describe('should handle custom app.yaml paths', () => {
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
        {path: 'yarn.lock', exists: true, contents: 'some content'},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult:
          {canInstallDeps: true, useYarn: true, appYamlPath: 'custom.yaml'},
      env: {GAE_APPLICATION_YAML_PATH: 'custom.yaml'}
    });

    performTest({
      title: 'should not use a custom app.yaml path if not specified',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'node.yaml', exists: true, contents: INVALID_APP_YAML_CONTENTS},
        {
          path: 'nodejs.yaml',
          exists: true,
          contents: INVALID_APP_YAML_CONTENTS
        },
        {
          path: 'client.yaml',
          exists: true,
          contents: INVALID_APP_YAML_CONTENTS
        },
        {
          path: 'server.yaml',
          exists: true,
          contents: INVALID_APP_YAML_CONTENTS
        },
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: true, contents: 'some content'},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        useYarn: true,
        appYamlPath: DEFAULT_APP_YAML
      }
    });
  });

  describe('should handle custom Node versions', () => {
    performTest({
      title: 'should detect the Node version in package.json if specified',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify(
              {name: 'some-package', engines: {node: '>=4.3.2'}})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        useYarn: false,
        appYamlPath: DEFAULT_APP_YAML,
        nodeVersion: '>=4.3.2'
      }
    });

    performTest({
      title:
          'should not detect a Node version in package.json if not specified',
      locations: [
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS}, {
          path: 'package.json',
          exists: true,
          // Note: package.json does not have an engines.node entry
          contents: JSON.stringify({name: 'some-package'})
        },
        {path: 'server.js', exists: true, contents: 'some content'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        useYarn: false,
        appYamlPath: DEFAULT_APP_YAML,
        // Note: nodeVersion is not defined
      }
    });
  });

  describe('should handle custom npm versions', () => {
    performTest({
      title: 'should detect the yarn version in package.json if specified',
      locations: [
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify(
              {engines: {yarn: '5.x'}, scripts: {start: 'npm start'}})
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        yarnVersion: '5.x',
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title:
          'should not detect a yarn version in package.json if not specified',
      locations: [
        {
          path: 'package.json',
          exists: true,
          // Note: package.json does not have a engines.yarn entry
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        // Note: yarnVersion is not specified
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });
  });

  describe('should handle custom yarn versions', () => {
    performTest({
      title: 'should detect the npm version in package.json if specified',
      locations: [
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify(
              {engines: {npm: '5.x'}, scripts: {start: 'npm start'}})
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        npmVersion: '5.x',
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should not detect a npm version in package.json if not specified',
      locations: [
        {
          path: 'package.json',
          exists: true,
          // Note: package.json does not have an engines.npm entry
          contents: JSON.stringify({scripts: {start: 'npm start'}})
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        // Note: nodeVersion is not specified
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });
  });

  describe('should handle simultaneous custom npm and yarn versions', () => {
    performTest({
      title: 'should detect both the npm version and yarn version if ' +
          'specified if npm is being used',
      locations: [
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({
            engines: {npm: '1.x', yarn: '2.x'},
            scripts: {start: 'npm start'}
          })
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        npmVersion: '1.x',
        yarnVersion: '2.x',
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should detect both the npm version and yarn version if ' +
          'specified if yarn is being used',
      locations: [
        {
          path: 'package.json',
          exists: true,
          contents: JSON.stringify({
            engines: {npm: '1.x', yarn: '2.x'},
            scripts: {start: 'npm start'}
          })
        },
        {path: 'app.yaml', exists: true, contents: 'some contents'},
        {path: 'yarn.lock', exists: true},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        npmVersion: '1.x',
        yarnVersion: '2.x',
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: true
      }
    });
  });

  describe('should detect the correct package manager', () => {
    performTest({
      title: 'should detect npm if neither yarn.lock nor ' +
          'package-lock.json exist and package.json exists',
      locations: [
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should detect npm if neither yarn.lock nor ' +
          'package-lock.json exist and package.json does not exist',
      locations: [
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: false,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should detect npm if yarn.lock does not exist and ' +
          'package-lock.json exists and package.json exists',
      locations: [
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: true}
      ],
      expectedResult: {
        canInstallDeps: true,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should detect npm if yarn.lock does not exist and ' +
          'package-lock.json exists and package.json does not exist',
      locations: [
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: false},
        {path: 'package-lock.json', exists: true}
      ],
      expectedResult: {
        canInstallDeps: false,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: false
      }
    });

    performTest({
      title: 'should detect yarn if yarn.lock exists and ' +
          'package-lock.json does not exist and package.json exists',
      locations: [
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: true},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: true,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: true
      }
    });

    performTest({
      title: 'should detect yarn if yarn.lock exists and ' +
          'package-lock.json does not exist and package.json does not exist',
      locations: [
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: true},
        {path: 'package-lock.json', exists: false}
      ],
      expectedResult: {
        canInstallDeps: false,
        appYamlPath: DEFAULT_APP_YAML,
        useYarn: true
      }
    });

    performTest({
      title: 'should throw an error if both yarn.lock and ' +
          'package-lock.json exist and package.json exists',
      locations: [
        {path: 'package.json', exists: true, contents: '{}'},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: true},
        {path: 'package-lock.json', exists: true}
      ],
      expectedResult: undefined,
      expectedThrownErrMessage: new RegExp(
          'The presence of yarn.lock ' +
          'indicates that yarn should be used, but the presence of ' +
          'package-lock.json indicates npm should be used.  Use the skip_files ' +
          'section of app.yaml to ignore the appropriate file to indicate ' +
          'which package manager to use.')
    });

    performTest({
      title: 'should throw an error if both yarn.lock and ' +
          'package-lock.json exist and package.json does not exist',
      locations: [
        {path: 'package.json', exists: false},
        {path: 'server.js', exists: true, contents: SERVER_JS_CONTENTS},
        {path: 'app.yaml', exists: true, contents: VALID_APP_YAML_CONTENTS},
        {path: 'yarn.lock', exists: true},
        {path: 'package-lock.json', exists: true}
      ],
      expectedResult: undefined,
      expectedThrownErrMessage: new RegExp(
          '^Cannot determine which package manager to use as both yarn.lock ' +
          'and package-lock.json files were detected.  The presence of ' +
          'yarn.lock indicates that yarn should be used, but the presence ' +
          'of package-lock.json indicates npm should be used.  Use the ' +
          'skip_files section of app.yaml to ignore the appropriate file ' +
          'to indicate which package manager to use.$')
    });
  });
});
