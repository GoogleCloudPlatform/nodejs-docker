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

require('source-map-support').install();

import * as assert from 'assert';

import { Reader, Locator } from '../src/fsview';
import { Logger } from '../src/logger';
import { Setup, detectSetup } from '../src/detect-setup';

class RecordedLogger implements Logger {
  logs: Array<string> = [];
  errors: Array<string> = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }
}

interface FakeReadViewConfig {
  path: string,
  /**
   * Specifies the contents of the file at the specified path or 
   * `null` if the file should be treated as if it doesn't exist.
   */
  contents: string | null
}

class FakeReadView implements Reader, Locator {
  constructor(private configs: Array<FakeReadViewConfig>) {
  }

  private findConfig(path: string) {
    return this.configs.find((value: FakeReadViewConfig): boolean => {
      return value.path === path;
    });
  }

  async read(path: string): Promise<string> {
    const contents: string | null = this.findConfig(path).contents;
    if (contents != null) {
      return contents;
    }

    throw new Error(`Path not found ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    const config = this.findConfig(path);
    if (!config) {
      throw new Error('Existence of unknown path "' + path + '" requested.  ' +
                      'Unit tests must explicitly list which paths exist ' +
                      'and don\'t exist');
    }
    return config.contents != null;
  }
}

const VALID_APP_YAML_CONTENTS = '' + 
`# A comment
runtime: node.js
env: flex
service: some-service
`;
const VALID_APP_YAML_CONTENTS_SKIP_YARN = VALID_APP_YAML_CONTENTS +
`skip_files:
- ^(.*/)?\.bak$
- ^yarn\.lock$
`;

describe('detect setup', () => {
  function performTest(title: string,
                       fsviewConfig: Array<FakeReadViewConfig>,
                       expectedLogs: Array<string>,
                       expectedErrors: Array<string>,
                       expectedResult: Setup,
                       expectedThrownErrMessage?: RegExp) {
    it(title, async () => {
      const logger = new RecordedLogger();
      const fsview = new FakeReadView(fsviewConfig);

      var setup;
      try {
        setup = await detectSetup(logger, fsview);
      }
      catch (e) {
        if (expectedThrownErrMessage) {
          assert(expectedThrownErrMessage.test(e.message),
                 '"' +e.message + '" does not match "' +
                 expectedThrownErrMessage + '"');
        }
        else {
          assert.ok(!e, `Unexpected error thrown ${e.message}`);
        }
      }
      assert.deepStrictEqual(setup, expectedResult);

      assert.deepStrictEqual(logger.logs, expectedLogs);
      assert.deepStrictEqual(logger.errors, expectedErrors);
    });
  }

  describe('should fail correctly', () => {
    performTest('should fail without app.yaml',
                [{
                  path: 'app.yaml',
                  contents: null
                }],
                [],
                [],
                undefined,
                /The file app.yaml does not exist/);

    performTest('should fail with an invalid app.yaml',
                [{
                  path: 'app.yaml',
                  contents: 'runtime: \'nodejs'
                  //                  ^
                  //                  +-- This is intentionally unclosed
                }],
                [],
                [],
                undefined,
                /unexpected end of the stream within a single quoted scalar.*/);

    performTest('should fail with app.yaml ' +
                'but wihtout package.json or server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: null
                }, {
                  path: 'server.js',
                  contents: null
                }],
                [ 'Checking for Node.js.',
                  'node.js checker: No package.json file.' ],
                [],
                undefined,
                new RegExp('node.js checker: Neither "start" in the '+
                           '"scripts" section of "package.json" nor ' +
                           'the "server.js" file were found.'));
  });

  describe('should detect correctly', () => {
    performTest('should detect without package.json and with server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: null
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }],
                [
                  'Checking for Node.js.',
                  'node.js checker: No package.json file.'
                ],
                [],
                {
                  gotPackageJson: false,
                  gotScriptsStart: false,
                  nodeVersion: null,
                  useYarn: false,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, without a start script, ' +
                'without yarn.lock, and with server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: '{}'
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: null
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: false,
                  nodeVersion: null,
                  useYarn: false,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, without a start script, ' +
                'with yarn.lock, with yarn.lock skipped, and with server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS_SKIP_YARN
                }, {
                  path: 'package.json',
                  contents: '{}'
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: 'some contents'
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: false,
                  nodeVersion: null,
                  useYarn: false,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, without a start script, ' +
                'with yarn.lock, and with server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: '{}'
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: 'some content'
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: false,
                  nodeVersion: null,
                  useYarn: true,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, with start script, ' +
                'without yarn.lock, and without server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: JSON.stringify({
                    scripts: {
                      start: 'npm start'
                    }
                  })
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: null
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: true,
                  nodeVersion: null,
                  useYarn: false,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, with start script, ' +
                'with yarn.lock, with yarn.lock skipped, and without server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS_SKIP_YARN
                }, {
                  path: 'package.json',
                  contents: JSON.stringify({
                    scripts: {
                      start: 'npm start'
                    }
                  })
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: 'some contents'
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: true,
                  nodeVersion: null,
                  useYarn: false,
                  runtime: 'nodejs'
                });

    performTest('should detect with package.json, with start script, ' +
                'with yarn.lock, and without server.js',
                [{
                  path: 'app.yaml',
                  contents: VALID_APP_YAML_CONTENTS
                }, {
                  path: 'package.json',
                  contents: JSON.stringify({
                    scripts: {
                      start: 'npm start'
                    }
                  })
                }, {
                  path: 'server.js',
                  contents: 'some content'
                }, {
                  path: 'yarn.lock',
                  contents: 'some content'
                }],
                [
                  'Checking for Node.js.'
                ],
                [
                  'node.js checker: ignoring invalid "engines" field in package.json',
                  'No node version specified.  Please add your node ' +
                  'version, see ' + 
                  'https://docs.npmjs.com/files/package.json#engines'
                ],
                {
                  gotPackageJson: true,
                  gotScriptsStart: true,
                  nodeVersion: null,
                  useYarn: true,
                  runtime: 'nodejs'
                });
  });
});
