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

export async function generateConfigs(baseNamespace: string,
                                      baseTag: string,
                                      appDirView: FsView,
                                      logger: Logger): Promise<Map<string, string>> {
  try {
    const setup = await detectSetup(logger, appDirView);
    return await generateFiles(baseNamespace, baseTag, appDirView, setup);
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
                 '<docker namespace> <candidate name> <app directory>');
    process.exit(1);
  }

  const baseNamespace = process.argv[2];
  const baseTag = process.argv[3];
  const appDir = process.argv[4];
  generateConfigs(baseNamespace, baseTag, new FsView(appDir), logger);
}
