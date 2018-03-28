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

const DEFAULT_APP_YAML = 'app.yaml';
const PACKAGE_JSON = './package.json';
const YARN_LOCK = 'yarn.lock';
const PACKAGE_LOCK_JSON = 'package-lock.json';
const CANNOT_RESOLVE_PACKAGE_MANAGER = 'Cannot determine which package ' +
    'manager to use as both yarn.lock and package-lock.json files ' +
    'were detected.  The presence of yarn.lock indicates that yarn should be ' +
    'used, but the presence of package-lock.json indicates npm should be ' +
    'used.  Use the skip_files section of app.yaml to ignore the appropriate ' +
    'file to indicate which package manager to use.';
const NODE_VERSION_WARNING = 'WARNING:  Your package.json does not specify ' +
    'a supported Node.js version.  Please pin your application to a major ' +
    'version of the Node.js runtime.  To learn more, visit ' +
    'https://cloud.google.com/appengine/docs/flexible/nodejs/runtime';
const NODE_UPDATED_WARNING = 'WARNING: The default Node.js major version ' +
    'is now Node 8 (instead of Node 6) because Node 8 has entered Long Term ' +
    'Support.  Since you have not pinned your application to a major ' +
    'version of the Node.js runtime, your application will automatically ' +
    'use Node 8.  To learn how to pin to a version of the Node.js runtime ' +
    'see https://cloud.google.com/appengine/docs/flexible/nodejs/runtime';

const BUILD_SCRIPT_NAME = 'gcp-build';

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
   * Specifies the semver expression representing the version of npm to be
   * installed, as specified by the application's package.json file.
   */
  npmVersion?: string;
  /**
   * Specifies the semver expression representing the version of yarn to be
   * installed, as specified by the application's package.json file.
   */
  yarnVersion?: string;
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
  /**
   * Specifies the path relative to the application's root directory that
   * identifies the yaml file used to deploy the application.
   */
  appYamlPath: string;
  /*
   * Specifies whether or not a build command should be run as part of the
   * deployment.  In particular, does the package.json file contain a
   * "gcp-build" script.
   */
  hasBuildCommand: boolean;
}

/**
 * Uses the `shell-escape` module to escape the given text and ensures that
 * the returned text is not enclosed in single quotes.  If the supplied text
 * is `undefined`, then this function simply returns `undefined`.
 *
 * @param text The text to process
 * @return `undefined` if the provided string is `undefined` or the escaped
 *         version of the text otherwise.
 */
function escape(text: string|undefined): string|undefined {
  if (!text) {
    return text;
  }

  return shellEscape([text.trim()]).replace(/^'+/g, '').replace(/'+$/g, '');
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
 * @throws If the deployment yaml file does not exist in the directory desribed
 *         by the given {@link Locator}.
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
  const appYamlPath = process.env.GAE_APPLICATION_YAML_PATH || DEFAULT_APP_YAML;
  if (!(await fsview.exists(appYamlPath))) {
    throw new Error(`The file ${appYamlPath} does not exist`);
  }
  const config = yaml.safeLoad(await fsview.read(appYamlPath));
  if (!config) {
    throw new Error(`Failed to load the file at ${appYamlPath}`);
  }

  // If nodejs has been explicitly specified then treat warnings as errors.
  const warn: (m: string) => void =
      (config as {runtime: {}}).runtime ? logger.error.bind(logger) : logger.log.bind(logger);

  logger.log('Checking for Node.js.');

  // Consider a file as present if and only if the file exists and is not
  // specified as being skipped in the deploment yaml file.
  let skipFiles = (config as {skip_files: string[]}).skip_files || [];
  if (!Array.isArray(skipFiles)) {
    skipFiles = [skipFiles];
  }

  function isSkipped(filename: string): boolean {
    return skipFiles.some((pattern: string) => {
      return new RegExp(pattern).test(filename);
    });
  }

  const yarnLockExists: boolean =
      !isSkipped(YARN_LOCK) && await fsview.exists(YARN_LOCK);
  const packageLockExists: boolean =
      !isSkipped(PACKAGE_LOCK_JSON) && await fsview.exists(PACKAGE_LOCK_JSON);
  if (yarnLockExists && packageLockExists) {
    throw new Error(CANNOT_RESOLVE_PACKAGE_MANAGER);
  }

  let canInstallDeps: boolean;
  let gotScriptsStart: boolean;
  let npmVersion: string|undefined;
  let yarnVersion: string|undefined;
  let nodeVersion: string|undefined;
  let hasBuildCommand = false;

  if (!(await fsview.exists(PACKAGE_JSON))) {
    logger.log('node.js checker: No package.json file.');
    canInstallDeps = false;
    gotScriptsStart = false;
    nodeVersion = undefined;
  } else {
    canInstallDeps = true;

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

    // Check if the user has specified specific versions of node or npm in the
    // package.json.
    if (packageJson.engines) {
      nodeVersion = packageJson.engines.node;
      npmVersion = packageJson.engines.npm;
      yarnVersion = packageJson.engines.yarn;
    }

    if (packageJson.scripts) {
      hasBuildCommand = BUILD_SCRIPT_NAME in packageJson.scripts;
    }
  }

  if (!nodeVersion) {
    warn(NODE_VERSION_WARNING);
    warn(NODE_UPDATED_WARNING);
  }

  if (!gotScriptsStart && !(await fsview.exists('server.js'))) {
    throw new Error(
        'node.js checker: Neither "start" in the ' +
        '"scripts" section of "package.json" nor ' +
        'the "server.js" file were found.');
  }

  // This variable is defined here to allow the Typescript compiler
  // to properly verify it is of type `Setup`.  If its value is directly
  // passed to the `extend` function, the compiler cannot check
  // that the input is of type `Setup` since `extend` takes `Object`s.
  const setup: Setup = {
    canInstallDeps,
    npmVersion: escape(npmVersion),
    yarnVersion: escape(yarnVersion),
    nodeVersion: escape(nodeVersion),
    useYarn: yarnLockExists,
    hasBuildCommand,
    appYamlPath
  };

  // extend filters out undefined properties.
  return extend({}, setup);
}
