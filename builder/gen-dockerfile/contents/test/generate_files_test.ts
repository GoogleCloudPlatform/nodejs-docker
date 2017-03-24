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

import { generateFiles } from '../src/generate_files';
import { Setup } from '../src/detect_setup';
import { Location, MockView } from './common';

const DOCKERFILE_NAME = 'Dockerfile';
const DOCKERIGNORE_NAME = '.dockerignore';

const BASE_NAMESPACE = 'some-namespace';
const BASE_TAG = 'some-tag';
const NODE_VERSION = 'v6.10.0';

const BASE = `# Dockerfile extending the generic Node image with application files for a
# single application.
FROM ${BASE_NAMESPACE}/nodejs:${BASE_TAG}\n`;

const UPGRADE_NODE = `# Check to see if the the version included in the base runtime satisfies
# ${NODE_VERSION}, if not then do an npm install of the latest available
# version that satisfies it.
RUN /usr/local/bin/install_node "${NODE_VERSION}"\n`;

const COPY_CONTENTS = `COPY . /app/\n`;

const INSTALL_YARN = `# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
RUN npm install --unsafe-perm --global yarn
`;

const NPM_INSTALL_DEPS = `# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
# This command will also cat the npm-debug.log file after the
# build, if it exists.
RUN npm install --unsafe-perm || \\
  ((if [ -f npm-debug.log ]; then \\
      cat npm-debug.log; \\
    fi) && false)
`;

const YARN_INSTALL_DEPS = `
RUN yarn install --production || \\
  ((if [ -f yarn-error.log ]; then \\
      cat yarn-error.log; \\
    fi) && false)\n`;

const YARN_START = `CMD yarn start\n`;
const NPM_START = `CMD npm start\n`;

const SERVER_START = `CMD node server.js\n`;

const DOCKERIGNORE = `# Copyright 2015 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

node_modules
.dockerignore
Dockerfile
npm-debug.log
yarn-error.log
.git
.hg
.svn
`;

function runTest(message: string,
                 config: Setup,
                 expectedDockerfile: string,
                 expectedDockerignore: string) {
  it(message, async () => {
    const appView = new MockView([]);
    const files = await generateFiles(BASE_NAMESPACE, BASE_TAG,
                                      appView, config);
    assert.ok(files);
    assert.strictEqual(files.size, 2);
    
    assert.strictEqual(files.has(DOCKERFILE_NAME), true);
    assert.strictEqual(files.has(DOCKERIGNORE_NAME), true);

    assert.strictEqual(files.get(DOCKERFILE_NAME), expectedDockerfile);
    assert.strictEqual(files.get(DOCKERIGNORE_NAME), expectedDockerignore);
  });
}

describe('generateFiles', () => {
  runTest('should generate correctly without package.json, without start script, without Node.version, and using npm', {
    gotPackageJson: false,
    gotScriptsStart: false,
    nodeVersion: undefined,
    useYarn: false
  },
  BASE + COPY_CONTENTS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, without start script, without Node.version, and using yarn', {
    gotPackageJson: false,
    gotScriptsStart: false,
    nodeVersion: undefined,
    useYarn: true
  },
  BASE + INSTALL_YARN + COPY_CONTENTS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, without start script, with Node.version, and using npm', {
    gotPackageJson: false,
    gotScriptsStart: false,
    nodeVersion: NODE_VERSION,
    useYarn: false,
  },
  BASE + UPGRADE_NODE + COPY_CONTENTS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, without start script, with Node.version, and using yarn', {
    gotPackageJson: false,
    gotScriptsStart: false,
    nodeVersion: NODE_VERSION,
    useYarn: true
  },
  BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, with start script, without Node.version, and using npm', {
    gotPackageJson: false,
    gotScriptsStart: true,
    nodeVersion: undefined,
    useYarn: false
  },
  BASE + COPY_CONTENTS + NPM_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, with start script, without Node.version, and using yarn', {
    gotPackageJson: false,
    gotScriptsStart: true,
    nodeVersion: undefined,
    useYarn: true
  },
  BASE + INSTALL_YARN + COPY_CONTENTS + YARN_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, with start script, with Node.version, and using npm', {
    gotPackageJson: false,
    gotScriptsStart: true,
    nodeVersion: NODE_VERSION,
    useYarn: false
  },
  BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_START,
  DOCKERIGNORE);

  runTest('should generate correctly without package.json, with start script, with Node.version, and using yarn', {
    gotPackageJson: false,
    gotScriptsStart: true,
    nodeVersion: NODE_VERSION,
    useYarn: true
  },
  BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + YARN_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, without start script, without Node.version, and using npm', {
    gotPackageJson: true,
    gotScriptsStart: false,
    nodeVersion: undefined,
    useYarn: false
  },
  BASE + COPY_CONTENTS + NPM_INSTALL_DEPS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, without start script, without Node.version, and using yarn', {
    gotPackageJson: true,
    gotScriptsStart: false,
    nodeVersion: undefined,
    useYarn: true
  },
  BASE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, without start script, with Node.version, and using npm', {
    gotPackageJson: true,
    gotScriptsStart: false,
    nodeVersion: NODE_VERSION,
    useYarn: false
  },
  BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_INSTALL_DEPS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, without start script, with Node.version, and using yarn', {
    gotPackageJson: true,
    gotScriptsStart: false,
    nodeVersion: NODE_VERSION,
    useYarn: true
  },
  BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS + SERVER_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, with start script, without Node.version, and using npm', {
    gotPackageJson: true,
    gotScriptsStart: true,
    nodeVersion: undefined,
    useYarn: false
  },
  BASE + COPY_CONTENTS + NPM_INSTALL_DEPS + NPM_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, with start script, without Node.version, and using yarn', {
    gotPackageJson: true,
    gotScriptsStart: true,
    nodeVersion: undefined,
    useYarn: true
  },
  BASE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS + YARN_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, with start script, with Node.version, and using npm', {
    gotPackageJson: true,
    gotScriptsStart: true,
    nodeVersion: NODE_VERSION,
    useYarn: false
  },
  BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_INSTALL_DEPS + NPM_START,
  DOCKERIGNORE);

  runTest('should generate correctly with package.json, with start script, with Node.version, and using yarn', {
    gotPackageJson: true,
    gotScriptsStart: true,
    nodeVersion: NODE_VERSION,
    useYarn: true
  },
  BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS + YARN_START,
  DOCKERIGNORE);
});
