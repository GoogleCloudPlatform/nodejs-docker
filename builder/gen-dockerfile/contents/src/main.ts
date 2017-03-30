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

import { Logger } from './logger';
import { FsView } from './fsview';
import { detectSetup } from './detect_setup';
import { generateFiles } from './generate_files';

/**
 * Analyzes a Node.js application in the directory specified by the
 * {@link appDirView} parameter and generates Dockerfile and .dockerignore
 * files in that directory that are used to build a Docker image that starts
 * the Node.js application when the image is Docker run.
 *
 * @param logger {@see detectSetup}
 * @param appDirView {@see detectSetup} and {@see generateFiles}
 * @param baseNamespace {@see generateFiles}
 * @param baseTag {@see generateFiles}
 */
async function generateConfigs(logger: Logger,
                               appDirView: FsView,
                               baseNamespace: string,
                               baseTag: string): Promise<Map<string, string>> {
  try {
    const setup = await detectSetup(logger, appDirView);
    return await generateFiles(appDirView, setup, baseNamespace, baseTag);
  }
  catch (e) {
    logger.error(`Application detection failed: ${e}`);
    process.exit(1);
  }
}

// Only run the code if this file was invoked from the command line
// (i.e. not required).
if (require.main === module) {
  const logger = {
    log: (message: string) => {
      console.log(message);
    },

    error: (message: string) => {
      console.error(message);
    }
  };

  if (process.argv.length !== 5) {
    logger.error(`Usage: ${process.argv[0]} ${process.argv[1]} ` +
                 '<app directory> <docker namespace> <candidate name>');
    process.exit(1);
  }

  const appDir = process.argv[2];
  const baseNamespace = process.argv[3];
  const baseTag = process.argv[4];
  generateConfigs(logger, new FsView(appDir), baseNamespace, baseTag);
}
