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

import {ArgumentParser} from 'argparse';

import {detectSetup} from './detect_setup';
import {FsView} from './fsview';
import {generateFiles} from './generate_files';
import {Logger} from './logger';

let PARSER = new ArgumentParser({
  version: require('../package.json').version,
  addHelp: true,
  description: 'Generates Dockerfile and .dockerignore files that can be ' +
      'used to build a Docker image that runs an application ' +
      'when Docker run.'
});
PARSER.addArgument(['--app-dir'], {
  help: 'The root directory of the application code',
  required: true,
  nargs: 1
});
PARSER.addArgument(['--runtime-image'], {
  help: 'The full Docker image name of the runtime image to use when ' +
      'constructing the Dockerfile',
  required: true,
  nargs: 1
});

const LOGGER = {
  log: (message: string) => {
    console.log(message);
  },

  error: (message: string) => {
    console.error(message);
  }
};

/**
 * Analyzes a Node.js application in the directory specified by the
 * {@link appDirView} parameter and generates Dockerfile and .dockerignore
 * files in that directory that are used to build a Docker image that starts
 * the Node.js application when the image is Docker run.
 *
 * @param logger {@see detectSetup}
 * @param appDirView {@see detectSetup} and {@see generateFiles}
 * @param baseImage {@see generateFiles}
 */
async function generateConfigs(
    logger: Logger, appDirView: FsView, baseImage: string):
    Promise<Map<string, string>> {
      try {
        const setup = await detectSetup(logger, appDirView);
        return await generateFiles(appDirView, setup, baseImage);
      } catch (e) {
        logger.error(`Application detection failed: ${e}`);
        process.exit(1);
        return Promise.reject(new Map<string, string>());
      }
    }

// exported for testing
/**
 * Parses the given array of strings, parses them, and returns the specified
 * application directory and runtime image.
 *
 * @param args The arguments to parse
 * @return The application directory and runtime image specified in the args
 */
export function
parseArgs(args?: string[]):
    {appDir: string, runtimeImage: string} {
      let parsedArgs = PARSER.parseArgs(args);
      return {
        appDir: parsedArgs.app_dir[0],
        runtimeImage: parsedArgs.runtime_image[0]
      };
    }

// Only run the code if this file was invoked from the command line
// (i.e. not required).
if (require.main === module) {
  const parsedArgs = parseArgs();
  generateConfigs(
      LOGGER, new FsView(parsedArgs.appDir), parsedArgs.runtimeImage);
}
