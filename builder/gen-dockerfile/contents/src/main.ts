
import { Logger } from './logger';
import { FsView } from './fsview';
import { detectSetup } from './detect-setup';
import { genConfig } from './gen-files';

export async function generateConfigs(dockerNamespace: string,
                                      candidateName: string,
                                      appDirView: FsView,
                                      logger: Logger): Promise<Map<string, string>> {
  try {
    const setup = await detectSetup(logger, appDirView);
    return await genConfig(dockerNamespace, candidateName, appDirView, setup);
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

  const dockerNamespace = process.argv[2];
  const candidateName = process.argv[3];
  const appDir = process.argv[4];
  generateConfigs(dockerNamespace, candidateName, new FsView(appDir), logger);
}
