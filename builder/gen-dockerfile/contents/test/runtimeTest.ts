/*
require('source-map-support').install();

import * as assert from 'assert';
import * as path from 'path';
import * as util from 'util';

import { Logger } from '../src/logger';
import { Reader, Writer, Locator, FsView } from '../src/fsview';
import { generateConfigs } from '../src/main';

const dedent = require('dedent-js');

class FakeAppView extends FsView {
  files: Map<string, string>;

  constructor() {
    super('');
    this.files = new Map();
  }

  read(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (this.files.has(path)) {
        resolve(this.files.get(path));
      }
      else {
        console.log(new Error());
        reject(new Error(`No such file: ${path}`));
      }
    });
  }

  write(path: string, contents: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.files.set(path, contents);
      resolve(null);
    });
  }

  exists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      resolve(this.files.has(path));
    });
  }

  contents(): Set<string> {
    return new Set(this.files.keys());
  }
}

describe('Successful file generation', () => {
  var dataView: FsView;
  var logger: Logger;
  before(() => {
    dataView = new FsView(path.join(__dirname, '../src/data/'));
    logger = {
      log: (path: string): void => {},
      error: (path: string): void => {}
    };
  });

  var appView: FakeAppView;
  beforeEach(() => {
    appView = new FakeAppView();
  });

  async function assertFileExistsWithContents(name: string, contents: string) {
    assert.strictEqual(await appView.exists(name), true);
    assert.strictEqual(await appView.read(name), contents);
  }

  function assertAppDirContents(expected: Array<string>) {
    var actual: Array<string> = Array.from(appView.contents());
    actual.sort();
    expected.sort();
    assert.deepEqual(actual, expected);
  }

  function genConfigs(): Promise<Map<string, string>> {
    return generateConfigs(appView, logger);
  }

  function assertGenFiles(genFiles: Map<string, string>, expected: any) {
    assert.equal(genFiles.size, Object.keys(expected).length);
    for (let name in expected) {
      assert.strictEqual(genFiles.has(name), true);
      assert.strictEqual(genFiles.get(name), expected[name]);
    }
    for (let key in genFiles.keys()) {
      assert.strictEqual(true, expected.hasOwnProperty(key));
    }
  }

  it('works with server.js only', async () => {
    await appView.write('server.js', 'fake contents');
    await genConfigs();
    await assertFileExistsWithContents('app.yaml',
      util.format(await dataView.read('app.yaml'), 'flex', 'nodejs'));
    await assertFileExistsWithContents('Dockerfile',
      util.format(await dataView.read('Dockerfile')) +
        dedent(`
          COPY . /app/
          CMD node server.js

        `));
    await assertFileExistsWithContents('.dockerignore',
      await dataView.read('dockerignore'));
    assertAppDirContents(['Dockerfile', '.dockerignore', 'app.yaml', 'server.js']);
  });

  it('server.js only no write', async () => {
    await appView.write('server.js', 'fake contents');
    await appView.write('app.yaml', 'env: flex\nruntime: nodejs');
    var genFiles = await genConfigs();
    assertGenFiles(genFiles, {
      'Dockerfile': util.format(await dataView.read('Dockerfile')) + dedent(`
        COPY . /app/
        CMD node server.js

      `),
      '.dockerignore': await dataView.read('dockerignore')
    });
    assertAppDirContents(['server.js', 'app.yaml', 'Dockerfile', '.dockerignore']);
  });
});
*/
