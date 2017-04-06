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

import * as path from 'path';
import * as util from 'util';

// Describe the signature of function exported by the `shell-escape` module
// so the compiler knows what types to expect and return.  This is needed
// since the `shell-escape` module does not have type definitions available.
const shellEscape: (args: string[]) => string = require('shell-escape');

import {Setup} from './detect_setup';
import {Writer, FsView} from './fsview';

/**
 * Generates a single file and records that the file was generated as well as
 * the contents of the file.
 *
 * @param writer   The {@link Writer} used to write the file
 * @param genFiles The map that maps file paths to file contents that is used
 *                 to record the files generated as well as their contents
 * @param relPath  The path, relative to the directory encapsulated by the
 *                 given {@link Writer}, of the file to write
 * @param contents The contents to write to the specified file
 */
async function generateSingleFile(
    writer: Writer, genFiles: Map<string, string>, relPath: string,
    contents: string):
    Promise<void> {
      await writer.write(relPath, contents);
      genFiles.set(relPath, contents);
    }

/**
 * Used to generate a Dockerfile and .dockerignore file that can be Docker run
 * to run the Node.js application described by the {@link config} parameter.
 *
 * @param appDirWriter  The writer that is capable of writing to the directory
 *                      where the Dockerfile and .dockerignore files should
 *                      be generated
 * @param config        The {@link Setup} that contains information about the
 *                      Node.js application that is used to generate the
 *                      Dockerfile and .dockerignore files.
 * @param baseNamespace The full Docker name of the Node.js base image to use
 *                      in the FROM line of the generated Dockerfile.
 *
 * @return A {@link Promise} so that this method can be used with async/await.
 *         The resolved value of the {@link Promise} is a map that maps
 *         relative paths of the files written to the contents written for
 *         each corresponding file.
 */
export async function generateFiles(
    appDirWriter: Writer, config: Setup,
    baseImage: string): Promise<Map<string, string>> {
  const genFiles = new Map();
  const dataDirReader = new FsView(path.join(__dirname, '../data'));

  // Customize the Dockerfile
  let dockerfile =
      util.format(await dataDirReader.read('Dockerfile'), baseImage);
  if (config.nodeVersion) {
    // Let node check to see if it satisfies the version constraint and
    // try to install the correct version if not.
    const versionSpec = shellEscape([config.nodeVersion]);
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
  } else {
    dockerfile += 'CMD node server.js\n';
  }

  // Generate the Dockerfile and .dockerignore files
  await generateSingleFile(appDirWriter, genFiles, 'Dockerfile', dockerfile);
  await generateSingleFile(
      appDirWriter, genFiles, '.dockerignore',
      await dataDirReader.read('dockerignore'));

  return genFiles;
}
