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

// Describe the signature of function exported by the `shell-escape` module
// so the compiler knows what types to expect and return.  This is needed
// since the `shell-escape` module does not have type definitions available.
const shellEscape: (args: string[]) => string = require('shell-escape');

import * as extend from 'extend';
import * as yaml from 'js-yaml';

import {Locator, Reader} from './fsview';
import {Logger} from './logger';

const APP_YAML = 'app.yaml';
const PACKAGE_JSON = './package.json';
const YARN_LOCK = 'yarn.lock';

/**
 * Encapsulates the information about the Node.js application detected by
 * the {@link detectSetup} method.
 */
export interface Setup {
  /**
   * Specifies whether the app directory contains the files necessary to
   * install dependencies using either `npm install` or `yarn install`
   */
  canInstallDeps: boolean;
  /**
   * Specifies whether the app directory's package.json file contains a
   * "scripts" section that contains a "start" command
   */
  gotScriptsStart: boolean;
  /**
   * Specifies the semver expression representing the version of Node.js used
   * to run the application as specified by the application's package.json file
   */
  nodeVersion?: string;
  /**
   * Specifies whether or not Yarn should be used to install the application's
   * dependencies and launch the app.
   */
  useYarn: boolean;
}

/**
 * This function is used to detect information about a Node.js application.
 * In particular, this function determines whether or not a `package.json`
 * file is available to allow `npm` or `yarn` to do an install, whether
 * the package.json file has a start script specified, whether the package.json
 * has an engines field specified that specifies a Node.js version to use,
 * and whether `yarn` or `npm` should be used to install dependencies and run
 * the application.
 *
 * @param logger Used to print statements designed for user consumption.
 * @param fsview Represents a view of the root directory of a Node.js
 *               application.
 *
 * @throws If an `app.yaml` file does not exist in the directory desribed by
 *         the given {@link Locator}.
 * @throws If a `package.json` file exists but a problem occurred while
 *         trying to parse the file.
 * @throws If the directory described by the {@link Reader} and {@link Locator}
 *         does not have a start script in the `package.json` file (or the
 *         `package.json` file doesn't exist) and the directory does not
 *         contain a `server.js` file.
 *
 * @return Information about the Node.js application in question that can
 *         be used to determine how to install the application's dependencies
 *         and run the application.
 */
export async function detectSetup(
    logger: Logger, fsview: Reader&Locator): Promise<Setup> {
  if (!(await fsview.exists(APP_YAML))) {
    throw new Error(`The file ${APP_YAML} does not exist`);
  }
  const config = yaml.safeLoad(await fsview.read(APP_YAML));

  // If nodejs has been explicitly specified then treat warnings as errors.
  const warn: (m: string) => void =
      config.runtime ? logger.error.bind(logger) : logger.log.bind(logger);

  logger.log('Checking for Node.js.');

  let canInstallDeps: boolean;
  let gotScriptsStart: boolean;
  let nodeVersion: string|undefined;
  let useYarn: boolean;

  if (!(await fsview.exists(PACKAGE_JSON))) {
    logger.log('node.js checker: No package.json file.');
    canInstallDeps = false;
    gotScriptsStart = false;
    nodeVersion = undefined;
    useYarn = false;
  } else {
    canInstallDeps = true;

    // Consider the yarn.lock file as present if and only if the yarn.lock
    // file exists and is not specified as being skipped in app.yaml.
    let skipFiles = config.skip_files || [];
    if (!Array.isArray(skipFiles)) {
      skipFiles = [skipFiles];
    }

    const yarnLockExists: boolean = await fsview.exists(YARN_LOCK);
    const yarnLockSkipped = skipFiles.some(
        (pattern: string) => new RegExp(pattern).test(YARN_LOCK));
    useYarn = yarnLockExists && !yarnLockSkipped;

    // Try to read the package.json file.
    let packageJson;
    const contents = await fsview.read(PACKAGE_JSON);

    try {
      packageJson = JSON.parse(contents);
    } catch (e) {
      // If we have an invalid or unreadable package.json file, there's
      // something funny going on here so fail recognition.
      // A package.json that exists is unusual enough that we want to warn
      // regardless of whether the nodejs runtime was specified.
      throw new Error(`node.js checker: error accessing package.json: ${e}`);
    }

    // See if we've got a scripts.start field.
    gotScriptsStart = !!(packageJson.scripts && packageJson.scripts.start);

    // See if a version of node is specified.
    if (packageJson.engines && packageJson.engines.node) {
      nodeVersion = packageJson.engines.node;
    } else {
      nodeVersion = undefined;
      warn(
          'node.js checker: ignoring invalid "engines" field in ' +
          'package.json');
    }

    if (!nodeVersion) {
      warn(
          'No node version specified.  Please add your node version, see ' +
          'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime');
    }
  }

  if (!gotScriptsStart && !(await fsview.exists('server.js'))) {
    throw new Error(
        'node.js checker: Neither "start" in the ' +
        '"scripts" section of "package.json" nor ' +
        'the "server.js" file were found.');
  }

  // extend filters undefined properties.
  const setup = extend({}, {
    canInstallDeps: canInstallDeps,
    gotScriptsStart: gotScriptsStart,
    nodeVersion: nodeVersion ? shellEscape([nodeVersion]) : undefined,
    useYarn: useYarn
  });
  return setup;
}
