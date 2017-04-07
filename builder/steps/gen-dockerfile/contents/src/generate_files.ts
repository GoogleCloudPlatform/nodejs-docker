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

import * as dot from 'dot';
dot.templateSettings.strip = false;

import {Setup} from './detect_setup';
import {Writer} from './fsview';

const DOCKERIGNORE_TEXT = `# Copyright 2015 Google Inc. All Rights Reserved.
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

const DOCKERFILE_TEMPLATE = dot.template(
    `# Dockerfile extending the generic Node image with application files for a
# single application.
FROM {{= it.baseImage }}
{{? it.config.nodeVersion }}
# Check to see if the the version included in the base runtime satisfies
# '{{= it.config.nodeVersion }}' and, if not, install a version of Node.js that does satisfy it.
RUN /usr/local/bin/install_node '{{= it.config.nodeVersion }}'
{{??}}
{{?}}
{{? it.config.useYarn }}
# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
RUN npm install --unsafe-perm --global yarn
{{?}}
COPY . /app/
{{? it.config.canInstallDeps }}
{{? it.config.useYarn }}
RUN yarn install --production || \\
  ((if [ -f yarn-error.log ]; then \\
      cat yarn-error.log; \\
    fi) && false)
{{??}}
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
{{?}}
{{?}}
{{? it.config.gotScriptsStart }}
CMD {{= it.tool }} start
{{??}}
CMD node server.js
{{?}}
`);

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
    appDirWriter: Writer, config: Setup, baseImage: string):
    Promise<Map<string, string>> {
      const genFiles = new Map();

      // Generate the Dockerfile and .dockerignore files
      await generateSingleFile(
          appDirWriter, genFiles, 'Dockerfile',
          DOCKERFILE_TEMPLATE({
            baseImage: baseImage,
            tool: config.useYarn ? 'yarn' : 'npm',
            config: config
          }).replace(/^\s*\n/gm, ''));
      await generateSingleFile(
          appDirWriter, genFiles, '.dockerignore', DOCKERIGNORE_TEXT);

      return genFiles;
    }
