
import { Logger } from './logger';
import { FsView } from './fsview';
import { detectSetup } from './detect-setup';
import { genConfig } from './gen-files';

export async function generateConfigs(appDirView: FsView,
                                      logger: Logger): Promise<Map<string, string>> {
  try {
    const setup = await detectSetup(logger, appDirView);
    return await genConfig(setup, appDirView);
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
  generateConfigs(new FsView(process.argv[2]), logger);
}
