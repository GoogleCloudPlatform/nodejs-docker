require('source-map-support').install();

import * as assert from 'assert';

import { Reader, Locator } from '../src/fsview';
import { Logger } from '../src/logger';
import { loadConfig, Setup, detectSetup } from '../src/detect-setup';

const dedent = require('dedent-js');

class RecordedLogger implements Logger {
  logs: Array<string> = [];
  errors: Array<string> = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }
}

interface FakeReadViewConfig {
  path: string,
  /**
   * Specifies the contents of the file at the specified path or 
   * `null` if the file should be treated as if it doesn't exist.
   */
  contents: string | null
}

class FakeReadView implements Reader, Locator {
  constructor(private configs: Array<FakeReadViewConfig>) {
  }

  private findConfig(path: string) {
    return this.configs.find((value: FakeReadViewConfig): boolean => {
      return value.path === path;
    });
  }

  async read(path: string): Promise<string> {
    const contents: string | null = this.findConfig(path).contents;
    if (contents != null) {
      return contents;
    }

    throw new Error(`Path not found ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    const config = this.findConfig(path);
    if (!config) {
      throw new Error('Existence of unknown path "' + path + '" requested.  ' +
                      'Unit tests must explicitly list which paths exist ' +
                      'and don\'t exist');
    }
    return config.contents != null;
  }
}

describe('loadConfig', () => {
  it('should return null if app.yaml does not exist', async () => {
    const fsview: Reader & Locator = {
      read: async path => {
        throw new Error('This should not have been called.');
      },

      exists: async path => {
        return false;
      }
    };

    assert.strictEqual(await loadConfig(fsview), null);
  });

  it('should load a valid app.yaml', async () => {
    const fsview = new FakeReadView([{
      path: 'app.yaml',
      contents: dedent(`
        # A comment
        runtime: node.js
        env: flex
        service: some-service
        skip_files:
        - ^(.*/)?\.bak$
        - ^yarn\.lock$
      `)
    }]);

    const appYaml = await loadConfig(fsview);
    assert.ok(appYaml);
    assert.strictEqual(appYaml.runtime, 'node.js');
    assert.strictEqual(appYaml.env, 'flex');
    assert.strictEqual(appYaml.service, 'some-service');
    assert.deepStrictEqual(appYaml.skip_files, [
      '^(.*/)?\.bak$',
      '^yarn\.lock$'
    ]);
  });

  it('should fail if reading app.yaml fails', async () => {
    const fsview: Reader & Locator = {
      read: async path => {
        assert.strictEqual(path, 'app.yaml');
        throw new Error('CUSTOM ERROR');
      },

      exists: async path => {
        assert.strictEqual(path, 'app.yaml');
        return path === 'app.yaml';
      }
    };

    var err;
    try {
      await loadConfig(fsview);
    }
    catch(e) {
      err = e;
    }

    assert.ok(err);
    assert.strictEqual(err.message, 'CUSTOM ERROR');
  });

  it('should fail on an invalid app.yaml', async () => {
    const fsview = new FakeReadView([{
      path: 'app.yaml',
      contents: 'runtime: \'nodejs'
        //                ^------- This is intentionally unterminated
        //                         to cause the yaml file to be invalid
    }]);

    var err;
    try {
      await loadConfig(fsview);
    }
    catch(e) {
      err = e;
    }

    assert.ok(err);
  });
});

describe('detect setup', () => {
  it('should fail without app.yaml, package.json, or server.js', async () => {
    const logger = new RecordedLogger();
    const fsview = new FakeReadView([{
      path: 'app.yaml',
      contents: null
    }, {
      path: 'package.json',
      contents: null
    }, {
      path: 'server.js',
      contents: null
    }]);

    try {
      await detectSetup(logger, fsview);
    }
    catch(e) {
      assert.ok(e);
      assert.strictEqual(e.message,
                         'node.js checker: Neither "start" in the '+
                         '"scripts" section of "package.json" nor ' +
                         'the "server.js" file were found.');
    }

    assert.deepStrictEqual(logger.logs, [
      'Checking for Node.js.',
      'node.js checker: No package.json file.'
    ]);
  });

  it('should detect without app.yaml without package.json, ' +
     'and with server.js', async () => {
    const logger = new RecordedLogger();
    const fsview = new FakeReadView([{
      path: 'app.yaml',
      contents: null
    }, {
      path: 'package.json',
      contents: null
    }, {
      path: 'server.js',
      contents: 'some content'
    }]);

    const setup = await detectSetup(logger, fsview);
    assert.deepStrictEqual(logger.logs, [
      'Checking for Node.js.',
      'node.js checker: No package.json file.'
    ]);

    const expectedSetup: Setup = {
      gotAppYaml: false,
      gotPackageJson: false,
      gotScriptsStart: false,
      nodeVersion: null,
      useYarn: false,
      runtime: 'nodejs',
      env: 'flex'
    };
    assert.deepStrictEqual(setup, expectedSetup);
  });

  it('should detect without app.yaml, with package.json, ' +
     'without a start script, without yarn.lock, and with server.js', async () => {
    const logger = new RecordedLogger();
    const fsview = new FakeReadView([{
      path: 'app.yaml',
      contents: null
    }, {
      path: 'package.json',
      contents: '{}'
    }, {
      path: 'server.js',
      contents: 'some content'
    }, {
      path: 'yarn.lock',
      contents: null
    }]);

    const setup = await detectSetup(logger, fsview);
    assert.deepStrictEqual(logger.logs, [
      'Checking for Node.js.',
      'node.js checker: ignoring invalid "engines" field in package.json',
      'No node version specified.  Please add your node ' +
      'version, see ' + 
      'https://docs.npmjs.com/files/package.json#engines'
    ]);

    const expectedSetup: Setup = {
      gotAppYaml: false,
      gotPackageJson: true,
      gotScriptsStart: false,
      nodeVersion: null,
      useYarn: false,
      runtime: 'nodejs',
      env: 'flex'
    };
    assert.deepStrictEqual(setup, expectedSetup);
  });
});
