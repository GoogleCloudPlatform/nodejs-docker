'use strict';

import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';

import { Setup } from './detect-setup';
import { Reader, Writer, FsView } from './fsview';

async function genFile(writer: Writer, genFiles: Map<string, string>,
                       name: string, contents: string) {
  await writer.write(name, contents);
  genFiles.set(name, contents);
}

export async function genConfig(config: Setup, appDirWriter: Writer): Promise<Map<string, string>> {
  const genFiles = new Map();
  const dataDirReader = new FsView(path.join(__dirname, 'data'));

  // Generate app.yaml
  if (!config.gotAppYaml) {
    var appYamlContents = await dataDirReader.read('app.yaml');
    await genFile(appDirWriter, genFiles,
                  'app.yaml', util.format(appYamlContents,
                                          config.env, config.runtime));
  }

  if (config.runtime !== 'custom') {
    // Customize the Dockerfile
    var dockerfile = await dataDirReader.read('Dockerfile');
    if (config.nodeVersion) {
      // Let node check to see if it satisfies the version constraint and
      // try to install the correct version if not.

      // TODO: Add proper shell escaping here.  The 'shell-escape' module
      // appears to have a bug.
      var versionSpec = config.nodeVersion;
      var installContents = await dataDirReader.read('install-node-version');
      dockerfile += util.format(installContents, versionSpec, versionSpec);
    }

    // If the directory structure indicates that yarn is being used
    // then install yarn since (unlike npm) Node.js doesn't include it
    if (config.useYarn) {
      dockerfile += await dataDirReader.read('install-yarn');
    }
    
    dockerfile += 'COPY . /app/\n';
    var tool = config.useYarn ? 'yarn' : 'npm';

    // Generate npm or yarn install if there is a package.json.
    if (config.gotPackageJson) {
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
    genFile(appDirWriter, genFiles, 'Dockerfile', dockerfile);
    genFile(appDirWriter, genFiles,
            '.dockerignore', await dataDirReader.read('dockerignore'));
  }

  return genFiles;
}
