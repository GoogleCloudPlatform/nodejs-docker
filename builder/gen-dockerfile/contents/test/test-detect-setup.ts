'use strict';

import * as assert from 'assert';

import { Reader, Locator } from '../src/fsview';
import { loadConfig, Setup, detectSetup } from '../src/detect-setup';

const dedent = require('dedent-js');

describe('load-config', () => {
  it('load a valid app.yaml', async () => {
    const fsview: Reader & Locator = {
      read: async path => {
        assert.strictEqual(path, 'app.yaml');
        return dedent(`
          # A comment
          runtime: node.js
          env: flex
          service: some-service
          skip_files:
          - ^(.*/)?\.bak$
          - ^yarn\.lock$
        `);
      },

      exists: async path => {
        assert.strictEqual(path, 'app.yaml');
        return path === 'app.yaml';
      }
    };

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

/*
  it('should fail if reading app.yaml fails', async () => {
    const fsview: Reader = {
      read: async path => {
        assert.strictEqual(path, 'app.yaml');
        throw new Error('CUSTOM ERROR');
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
    const fsview: Reader = {
      read: async (path) => {
        assert.strictEqual(path, 'app.yaml');
        return 'runtime: \'nodejs';
        //               ^------- This is intentionally unterminated
        //                        to cause the yaml file to be invalid
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
  });
  */
});
