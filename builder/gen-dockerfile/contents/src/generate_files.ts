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

import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';

const shellEscape: (args: Array<string>) => string = require('shell-escape');

import { Setup } from './detect_setup';
import { Reader, Writer, FsView } from './fsview';

async function generateSingleFile(writer: Writer, genFiles: Map<string, string>,
                                  name: string, contents: string) {
  await writer.write(name, contents);
  genFiles.set(name, contents);
}

export async function generateFiles(baseNamespace: string,
                                    baseTag: string,
                                    appDirWriter: Writer,
                                    config: Setup): Promise<Map<string, string>> {
  const genFiles = new Map();
  const dataDirReader = new FsView(path.join(__dirname, 'data'));

  // Customize the Dockerfile
  let dockerfile = util.format(await dataDirReader.read('Dockerfile'),
                               baseNamespace,
                               baseTag);
  if (config.nodeVersion) {
    // Let node check to see if it satisfies the version constraint and
    // try to install the correct version if not.
    const versionSpec = shellEscape([ config.nodeVersion ]);
    const installContents = await dataDirReader.read('install-node-version');
    dockerfile += util.format(installContents, versionSpec, versionSpec);
  }

  // If the directory structure indicates that yarn is being used
  // then install yarn since (unlike npm) Node.js doesn't include it
  if (config.useYarn) {
    dockerfile += await dataDirReader.read('install-yarn');
  }
  
  dockerfile += 'COPY . /app/\n';
  const tool = config.useYarn ? 'yarn' : 'npm';

  // Generate npm or yarn install if there is a package.json.
  if (config.canInstallDeps) {
    dockerfile += await dataDirReader.read(`${tool}-package-json-install`);
  }

  // Generate the appropriate start command.
  if (config.gotScriptsStart) {
      dockerfile += `CMD ${tool} start\n`;
  }
  else {
      dockerfile += 'CMD node server.js\n';
  }

  // Generate the Dockerfile and .dockerignore files
  await generateSingleFile(appDirWriter, genFiles, 'Dockerfile', dockerfile);
  await generateSingleFile(appDirWriter, genFiles,
                           '.dockerignore',
                           await dataDirReader.read('dockerignore'));

  return genFiles;
}
