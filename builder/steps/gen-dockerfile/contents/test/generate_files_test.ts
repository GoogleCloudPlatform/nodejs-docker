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

import assert from 'assert';

import {Setup} from '../src/detect_setup';
import {generateFiles} from '../src/generate_files';

import {Location, MockView} from './common';

const DOCKERFILE_NAME = 'Dockerfile';
const DOCKERIGNORE_NAME = '.dockerignore';

const BASE_IMAGE = 'some-namespace:some-tag';
const NODE_VERSION = 'v6.10.0';
const NPM_VERSION = '^5.0.2';
const YARN_VERSION = '^1.2.3';

const BASE =
    `# Dockerfile extending the generic Node image with application files for a
# single application.
FROM ${BASE_IMAGE}
`;

const BUILD_COMMAND = 'npm run gcp-build';

const UPGRADE_NODE =
    `# Check to see if the the version included in the base runtime satisfies
# '${NODE_VERSION}' and, if not, install a version of Node.js that does satisfy it.
RUN /usr/local/bin/install_node '${NODE_VERSION}'
`;

const INSTALL_NPM =
    `# Install the version of npm as requested by the engines.npm field in
# package.json.
#
# The package manager yarn is used to perform the installation because
# there is a known issue with installing npm globally during a Docker build.
# See npm issue #9863 at https://github.com/npm/npm/issues/9863 for more
# information.
RUN yarn global add npm@'${NPM_VERSION}'
`;

const INSTALL_YARN =
    `# Install the version of yarn as requested by the engines.yarn field in
# package.json.
RUN yarn global add yarn@'${YARN_VERSION}'
`;

const COPY_CONTENTS = `COPY . /app/\n`;

const NPM_INSTALL_PRODUCTION_DEPS =
    `# You have to specify "--unsafe-perm" with npm install
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

const YARN_INSTALL_PRODUCTION_DEPS = `RUN yarn install --production || \\
  ((if [ -f yarn-error.log ]; then \\
      cat yarn-error.log; \\
    fi) && false)
`;

const YARN_START = `CMD yarn start\n`;
const NPM_START = `CMD npm start\n`;

const BASE_DOCKERIGNORE = `# Copyright 2015 Google Inc. All Rights Reserved.
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
.svn`;

const DEFAULT_APP_YAML = 'app.yaml';

const DEFAULT_DOCKERIGNORE = `${BASE_DOCKERIGNORE}\n${DEFAULT_APP_YAML}\n`;

interface TestConfig {
  config: Setup;
  expectedDockerfile?: StringVerifier;
  expectedDockerignore?: StringVerifier;
}

declare type StringVerifier = (str?: string) => boolean;
interface VerifiableLocation {
  readonly path: string;
  readonly exists: boolean;
  readonly contents: StringVerifier;
}

function hasLocation(locationArr: Location[], location: VerifiableLocation) {
  return locationArr.findIndex(loc => {
    return loc && loc.exists === location.exists &&
        loc.path === location.path && location.contents(loc.contents);
  }) !== -1;
}

function exactly(expected: string): StringVerifier {
  return (actual?: string) => {
    return expected === actual;
  };
}

function notContains(expected: string): StringVerifier {
  return (actual?: string) => {
    return actual !== undefined && !actual.includes(expected);
  };
}

async function runTest(testConfig: TestConfig) {
  const appView = new MockView([]);
  const files = await generateFiles(appView, testConfig.config, BASE_IMAGE);
  assert.ok(files);

  // Verify the paths written matches the number of locations returned
  // by the method.
  assert.strictEqual(files.size, 2);
  assert.strictEqual(appView.pathsWritten.length, 2);

  assert.strictEqual(files.has(DOCKERFILE_NAME), true);
  assert.strictEqual(files.has(DOCKERIGNORE_NAME), true);

  if (testConfig.expectedDockerfile) {
    testConfig.expectedDockerfile(files.get(DOCKERFILE_NAME));
    assert(hasLocation(appView.pathsWritten, {
      path: 'Dockerfile',
      exists: true,
      contents: testConfig.expectedDockerfile
    }));
  }

  if (testConfig.expectedDockerignore) {
    testConfig.expectedDockerignore(files.get(DOCKERIGNORE_NAME));
    assert(hasLocation(appView.pathsWritten, {
      path: '.dockerignore',
      exists: true,
      contents: testConfig.expectedDockerignore
    }));
  }
}

describe('generateFiles', async () => {
  describe('should be consistent with deploys not using the runtime builder', async () => {
    it('should generate correctly without installing dependencies, without ' +
           'start script, without Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: undefined,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(BASE + COPY_CONTENTS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, without ' +
           'start script, without Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: undefined,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(BASE + COPY_CONTENTS + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, without ' +
           'start script, with Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: NODE_VERSION,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile:
               exactly(BASE + COPY_CONTENTS + UPGRADE_NODE + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, without ' +
           'start script, with Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile:
               exactly(BASE + COPY_CONTENTS + UPGRADE_NODE + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, with start ' +
           'script, without Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: undefined,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(BASE + COPY_CONTENTS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, with start ' +
           'script, without Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: undefined,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(BASE + COPY_CONTENTS + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, with start ' +
           'script, with Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: NODE_VERSION,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile:
               exactly(BASE + COPY_CONTENTS + UPGRADE_NODE + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly without installing dependencies, with start ' +
           'script, with Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile:
               exactly(BASE + COPY_CONTENTS + UPGRADE_NODE + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, without start ' +
           'script, without Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: undefined,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + NPM_INSTALL_PRODUCTION_DEPS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, without start ' +
           'script, without Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: undefined,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + YARN_INSTALL_PRODUCTION_DEPS +
               YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, without start ' +
           'script, with Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + UPGRADE_NODE +
               NPM_INSTALL_PRODUCTION_DEPS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, without start ' +
           'script, with Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + UPGRADE_NODE +
               YARN_INSTALL_PRODUCTION_DEPS + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, with start ' +
           'script, without Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: undefined,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + NPM_INSTALL_PRODUCTION_DEPS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, with start ' +
           'script, without Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: undefined,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + YARN_INSTALL_PRODUCTION_DEPS +
               YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, with start ' +
           'script, with Node.version, and using npm',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: false,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + UPGRADE_NODE +
               NPM_INSTALL_PRODUCTION_DEPS + NPM_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with installing dependencies, with start ' +
           'script, with Node.version, and using yarn',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerfile: exactly(
               BASE + COPY_CONTENTS + UPGRADE_NODE +
               YARN_INSTALL_PRODUCTION_DEPS + YARN_START),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });
  });

  describe('should handle custom yaml paths', async () => {
    it('should include a custom yaml path in .dockerignore if specified',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: 'custom.yaml',
             hasBuildCommand: false
           },
           expectedDockerignore: exactly(`${BASE_DOCKERIGNORE}\ncustom.yaml\n`)
         });
       });

    it('should not include a custom yaml path in .dockerignore if not specified',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             nodeVersion: NODE_VERSION,
             useYarn: true,
             appYamlPath: DEFAULT_APP_YAML,
             hasBuildCommand: false
           },
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });
  });

  describe('should handle custom npm versions', async () => {
    it('should install the version of npm if specified', async () => {
      await runTest({
        config: {
          canInstallDeps: true,
          npmVersion: NPM_VERSION,
          useYarn: false,
          appYamlPath: DEFAULT_APP_YAML,
          hasBuildCommand: false
        },
        expectedDockerfile: exactly(
            BASE + COPY_CONTENTS + INSTALL_NPM + NPM_INSTALL_PRODUCTION_DEPS +
            NPM_START)
      });
    });

    it('should not install npm if a version is not specified', async () => {
      await runTest({
        config: {
          canInstallDeps: true,
          // Note: npmVersion is not specified
          useYarn: false,
          appYamlPath: DEFAULT_APP_YAML,
          hasBuildCommand: false
        },
        expectedDockerfile: exactly(
            BASE + COPY_CONTENTS + NPM_INSTALL_PRODUCTION_DEPS + NPM_START)
      });
    });
  });

  describe('should handle custom yarn versions', async () => {
    it('should install the version of yarn if specified', async () => {
      await runTest({
        config: {
          canInstallDeps: true,
          yarnVersion: YARN_VERSION,
          useYarn: true,
          appYamlPath: DEFAULT_APP_YAML,
          hasBuildCommand: false
        },
        expectedDockerfile: exactly(
            BASE + COPY_CONTENTS + INSTALL_YARN + YARN_INSTALL_PRODUCTION_DEPS +
            YARN_START)
      });
    });

    it('should not install yarn if a version is not specified', async () => {
      await runTest({
        config: {
          canInstallDeps: true,
          // Note: yarnVersion is not specified
          useYarn: true,
          appYamlPath: DEFAULT_APP_YAML,
          hasBuildCommand: false
        },
        expectedDockerfile: exactly(
            BASE + COPY_CONTENTS + YARN_INSTALL_PRODUCTION_DEPS + YARN_START)
      });
    });
  });

  describe(
      'should handle simultaneous custom npm and yarn versions', async () => {
        it('should only install npm if it is being used', async () => {
          await runTest({
            config: {
              canInstallDeps: true,
              npmVersion: NPM_VERSION,
              yarnVersion: YARN_VERSION,
              useYarn: false,
              appYamlPath: DEFAULT_APP_YAML,
              hasBuildCommand: false
            },
            expectedDockerfile: exactly(
                BASE + COPY_CONTENTS + INSTALL_NPM +
                NPM_INSTALL_PRODUCTION_DEPS + NPM_START)
          });
        });

        it('should only install yarn if it is being used', async () => {
          await runTest({
            config: {
              canInstallDeps: true,
              npmVersion: NPM_VERSION,
              yarnVersion: YARN_VERSION,
              useYarn: true,
              appYamlPath: DEFAULT_APP_YAML,
              hasBuildCommand: false
            },
            expectedDockerfile: exactly(
                BASE + COPY_CONTENTS + INSTALL_YARN +
                YARN_INSTALL_PRODUCTION_DEPS + YARN_START)
          });
        });
      });

  describe('should handle build commands', async () => {
    it('should generate correctly with a build command specified and can ' +
           'install deps',
       async () => {
         await runTest({
           config: {
             canInstallDeps: true,
             useYarn: false,
             hasBuildCommand: true,
             appYamlPath: DEFAULT_APP_YAML
           },
           expectedDockerfile: exactly(`FROM ${BASE_IMAGE} as build_step
COPY . /app/
# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
# This command will also cat the npm-debug.log file after the
# build, if it exists.
RUN NODE_ENV=development npm install --unsafe-perm || \\
  ((if [ -f npm-debug.log ]; then \\
      cat npm-debug.log; \\
    fi) && false)
RUN ${BUILD_COMMAND}
RUN rm -Rf node_modules
FROM build_step
COPY --from=build_step /app .
# You have to specify "--unsafe-perm" with npm install
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
CMD npm start
`),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should generate correctly with a build command specified and cannot ' +
           'install deps',
       async () => {
         await runTest({
           config: {
             canInstallDeps: false,
             useYarn: false,
             hasBuildCommand: true,
             appYamlPath: DEFAULT_APP_YAML
           },
           expectedDockerfile: exactly(`FROM ${BASE_IMAGE} as build_step
COPY . /app/
RUN ${BUILD_COMMAND}
FROM build_step
COPY --from=build_step /app .
CMD npm start
`),
           expectedDockerignore: exactly(DEFAULT_DOCKERIGNORE)
         });
       });

    it('should not generate for a build command if not specified', async () => {
      await runTest({
        config: {
          canInstallDeps: true,
          useYarn: false,
          hasBuildCommand: false,
          appYamlPath: DEFAULT_APP_YAML
        },
        expectedDockerfile: notContains(BUILD_COMMAND)
      });
    });
  });
});
