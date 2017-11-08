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

import * as ejs from 'ejs';
import * as path from 'path';

import {Setup} from './detect_setup';
import {FsView, Writer} from './fsview';

/**
 * Returns a string template with the specified template values filled in.
 * Any blank lines are removed from the resulting string.
 *
 * @param template The template to render.
 * @param data An object whose keys are used to identify the text in the
 *  template to replace with the value of the object's key.
 * @return The template supplied with the supplied data filled in.
 */
function renderTemplate(template: string, data?: ejs.Data): string {
  return ejs.render(template, data).replace(/^\s*\n/gm, '');
}

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
    contents: string): Promise<void> {
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

  // Generate the Dockerfile and remove any empty lines
  const dockerfileTemplate = await dataDirReader.read('Dockerfile.txt');
  const dockerfile = renderTemplate(
      dockerfileTemplate,
      {baseImage, tool: config.useYarn ? 'yarn' : 'npm', config});

  const dockerignoreTemplate = await dataDirReader.read('dockerignore');
  const dockerignore = renderTemplate(dockerignoreTemplate, {config});

  // Generate the Dockerfile and .dockerignore files
  await generateSingleFile(appDirWriter, genFiles, 'Dockerfile', dockerfile);
  await generateSingleFile(
      appDirWriter, genFiles, '.dockerignore', dockerignore);

  return genFiles;
}
