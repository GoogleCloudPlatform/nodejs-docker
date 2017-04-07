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

import {generateFiles} from '../src/generate_files';
import {Setup} from '../src/detect_setup';
import {Location, MockView} from './common';
import {FsView} from '../src/fsview';

const DOCKERFILE_NAME = 'Dockerfile';
const DOCKERIGNORE_NAME = '.dockerignore';

const BASE_IMAGE = 'some-namespace:some-tag';
const NODE_VERSION = 'v6.10.0';

async function runTest(
    config: Setup, expectedDockerfile: string, expectedDockerignore: string) {
  const appView = new MockView([]);
  const files = await generateFiles(appView, config, BASE_IMAGE);
  assert.ok(files);
  assert.strictEqual(files.size, 2);

  assert.strictEqual(files.has(DOCKERFILE_NAME), true);
  assert.strictEqual(files.has(DOCKERIGNORE_NAME), true);

  assert.strictEqual(files.get(DOCKERFILE_NAME), expectedDockerfile);
  assert.strictEqual(files.get(DOCKERIGNORE_NAME), expectedDockerignore);

  const expectedFilesWritten: Location[] = [
    {path: 'Dockerfile', exists: true, contents: expectedDockerfile},
    {path: '.dockerignore', exists: true, contents: expectedDockerignore}
  ];

  assert.strictEqual(appView.pathsWritten.length, 2);
  assert.deepStrictEqual(appView.pathsWritten, expectedFilesWritten);
}

describe('generateFiles', async () => {

  let BASE: string;
  let UPGRADE_NODE: string;
  let COPY_CONTENTS: string;
  let INSTALL_YARN: string;
  let NPM_INSTALL_DEPS: string;
  let YARN_INSTALL_DEPS: string;
  let YARN_START: string;
  let NPM_START: string;
  let SERVER_START: string;
  let DOCKERIGNORE: string;
  before(async () => {
    const dataView = new FsView('.');

    BASE = `# Dockerfile extending the generic Node image with application files for a
# single application.
FROM ${BASE_IMAGE}
`;

    UPGRADE_NODE = `# Check to see if the the version included in the base runtime satisfies
# '${NODE_VERSION}' and, if not, install a version of Node.js that does satisfy it.
RUN /usr/local/bin/install_node '${NODE_VERSION}'
`;

    COPY_CONTENTS = `COPY . /app/\n`;

    INSTALL_YARN = `# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
RUN npm install --unsafe-perm --global yarn
`;

    NPM_INSTALL_DEPS = `# You have to specify "--unsafe-perm" with npm install
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

    YARN_INSTALL_DEPS = `RUN yarn install --production || \\
  ((if [ -f yarn-error.log ]; then \\
      cat yarn-error.log; \\
    fi) && false)
`;

    YARN_START = `CMD yarn start\n`;
    NPM_START = `CMD npm start\n`;
    SERVER_START = `CMD node server.js\n`;

    DOCKERIGNORE = await dataView.read('./data/dockerignore');
  });

  it('should generate correctly without installing dependencies, without start script, without Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: false,
             nodeVersion: undefined,
             useYarn: false
           },
           BASE + COPY_CONTENTS + SERVER_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, without start script, without Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: false,
             nodeVersion: undefined,
             useYarn: true
           },
           BASE + INSTALL_YARN + COPY_CONTENTS + SERVER_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, without start script, with Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: false,
             nodeVersion: NODE_VERSION,
             useYarn: false,
           },
           BASE + UPGRADE_NODE + COPY_CONTENTS + SERVER_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, without start script, with Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: false,
             nodeVersion: NODE_VERSION,
             useYarn: true
           },
           BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + SERVER_START,
           DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, with start script, without Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: true,
             nodeVersion: undefined,
             useYarn: false
           },
           BASE + COPY_CONTENTS + NPM_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, with start script, without Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: true,
             nodeVersion: undefined,
             useYarn: true
           },
           BASE + INSTALL_YARN + COPY_CONTENTS + YARN_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, with start script, with Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: true,
             nodeVersion: NODE_VERSION,
             useYarn: false
           },
           BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_START, DOCKERIGNORE);
     });

  it('should generate correctly without installing dependencies, with start script, with Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: false,
             gotScriptsStart: true,
             nodeVersion: NODE_VERSION,
             useYarn: true
           },
           BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS + YARN_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, without start script, without Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: false,
             nodeVersion: undefined,
             useYarn: false
           },
           BASE + COPY_CONTENTS + NPM_INSTALL_DEPS + SERVER_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, without start script, without Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: false,
             nodeVersion: undefined,
             useYarn: true
           },
           BASE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS +
               SERVER_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, without start script, with Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: false,
             nodeVersion: NODE_VERSION,
             useYarn: false
           },
           BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_INSTALL_DEPS +
               SERVER_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, without start script, with Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: false,
             nodeVersion: NODE_VERSION,
             useYarn: true
           },
           BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS +
               YARN_INSTALL_DEPS + SERVER_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, with start script, without Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: true,
             nodeVersion: undefined,
             useYarn: false
           },
           BASE + COPY_CONTENTS + NPM_INSTALL_DEPS + NPM_START, DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, with start script, without Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: true,
             nodeVersion: undefined,
             useYarn: true
           },
           BASE + INSTALL_YARN + COPY_CONTENTS + YARN_INSTALL_DEPS + YARN_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, with start script, with Node.version, and using npm',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: true,
             nodeVersion: NODE_VERSION,
             useYarn: false
           },
           BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_INSTALL_DEPS + NPM_START,
           DOCKERIGNORE);
     });

  it('should generate correctly with installing dependencies, with start script, with Node.version, and using yarn',
     async () => {
       await runTest(
           {
             canInstallDeps: true,
             gotScriptsStart: true,
             nodeVersion: NODE_VERSION,
             useYarn: true
           },
           BASE + UPGRADE_NODE + INSTALL_YARN + COPY_CONTENTS +
               YARN_INSTALL_DEPS + YARN_START,
           DOCKERIGNORE);
     });
});
