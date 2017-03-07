/*
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as yaml from 'js-yaml';

import { Logger } from './logger';
import { Reader, Locator } from './fsview';

const APP_YAML = 'app.yaml';
const PACKAGE_JSON = 'package.json';
const YARN_LOCK = 'yarn.lock';

export interface Setup {
  gotPackageJson: boolean;
  gotScriptsStart: boolean;
  nodeVersion: string;
  useYarn: boolean;
  runtime: string;
}

// This throws if app.yaml does not exist or cannot be parsed
export async function loadConfig(fsview: Reader & Locator) {
  if (!(await fsview.exists(APP_YAML))) {
    throw new Error(`The file ${APP_YAML} does not exist`);
  }
  return yaml.safeLoad(await fsview.read(APP_YAML));
}

export async function detectSetup(logger: Logger,
                                  fsview: Reader & Locator): Promise<Setup> {
  const config = await loadConfig(fsview);

  // If nodejs has been explicitly specified then treat warnings as errors.
  var warn: (m: string) => void = config.runtime ? logger.error.bind(logger)
                                                 : logger.log.bind(logger);

  logger.log('Checking for Node.js.');

  var gotPackageJson: boolean;
  var gotScriptsStart: boolean;
  var nodeVersion: string;
  var useYarn: boolean;

  if (!(await fsview.exists(PACKAGE_JSON))){
    logger.log('node.js checker: No package.json file.');
    gotPackageJson = false;
    gotScriptsStart = false;
    nodeVersion = null;
    useYarn = false;
  }
  else {
    gotPackageJson = true;

    // Consider the yarn.lock file as present if and only if the yarn.lock
    // file exists and is not specified as being skipped in app.yaml.
    var skipFiles = config.skip_files || [];
    if (!Array.isArray(skipFiles)) {
      skipFiles = [ skipFiles ];
    }

    const yarnLockExists: boolean = await fsview.exists(YARN_LOCK);
    var yarnLockSkipped = false;
    skipFiles.forEach((pattern: string) => {
      yarnLockSkipped = yarnLockSkipped || new RegExp(pattern).test(YARN_LOCK);
    });

    useYarn = yarnLockExists && !yarnLockSkipped;

    // Try to read the package.json file.
    var packageJson;
    var packageJsonError;
    var contents = await fsview.read(PACKAGE_JSON);

    try {
      packageJson = JSON.parse(contents);
    }
    catch (e) {
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
    }
    else {
      nodeVersion = null;
      warn('node.js checker: ignoring invalid "engines" field in ' +
          'package.json');
    }

    if (!nodeVersion) {
      warn('No node version specified.  Please add your node ' +
          'version, see ' + 
          'https://docs.npmjs.com/files/package.json#engines');
    }
  }

  if (!gotScriptsStart && !(await fsview.exists('server.js'))) {
    throw new Error('node.js checker: Neither "start" in the '+
                    '"scripts" section of "package.json" nor ' +
                    'the "server.js" file were found.');
  }

  return {
    gotPackageJson: gotPackageJson,
    gotScriptsStart: gotScriptsStart,
    nodeVersion: nodeVersion,
    useYarn: useYarn,
    runtime: config && config.runtime === 'custom' ? 'custom' : 'nodejs'
  };
}
