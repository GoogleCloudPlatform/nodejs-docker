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

import * as assert from 'assert';
import {spawn} from 'child_process';
import {exec} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'request';
import * as util from 'util';
import * as uuid from 'uuid';

const TIMEOUT = 3000;
const PORT = 8080;

const TAG_PREFIX = 'test/nodejs-docker/integration';
const RUNTIME_TAG = `${TAG_PREFIX}/runtime`;
const GEN_DOCKERFILE_DIR = path.join(__dirname, '..', '..', '..', 'builder',
                                     'steps', 'gen-dockerfile', 'contents');
const GEN_DOCKERFILE_FILE =
    path.join(GEN_DOCKERFILE_DIR, 'dist', 'src', 'main.js');

interface TestConfig {
  directoryName: string;
  expectedOutput: string;
}

const CONFIGURATIONS: TestConfig[] = [
  {directoryName : 'hello-world', expectedOutput : 'Hello World'},
  {directoryName : 'custom-npm-simple', expectedOutput : '2.7.1\n'},
  {directoryName : 'custom-npm-complex', expectedOutput : '2.7.1\n'}
];

const DEBUG = false;
function log(message: string): void {
  if (DEBUG) {
    console.log(message);
  }
}

function run(cmd: string, args: string[], options: {[key: string]: any},
             cb: (err: Error|null) => void): void {
  spawn(cmd, args, options).on('exit', exitCode => {
    if (exitCode !== 0) {
      const fullCmd = cmd + ' ' + args.join(' ');
      return cb(new Error(
          `'${fullCmd}' encountered a non-zero exit code: ${exitCode}`));
    }
    return cb(null);
  });
}

function buildGenDockerfile(cb: (err: Error|null) => void): void {
  const options = {stdio : 'inherit', cwd : GEN_DOCKERFILE_DIR};
  run('npm', [ 'install' ], options, (err) => {
    if (err) {
      return cb(err);
    }
    run('npm', [ 'run', 'prepublish' ], options, cb);
  });
}

function dockerBuild(tag: string, baseDir: string,
                     cb: (err: Error|null) => void): void {
  run('docker', [ 'build', '-t', tag, baseDir ], {stdio : 'inherit'}, cb);
}

/**
 * Start a docker process for the given test
 */
function runDocker(tag: string, name: string, port: number,
                   callback: (host: string) => void) {
  let d = spawn(
      'docker',
      [ 'run', '--rm', '-i', '--name', name, '-p', `${port}:${port}`, tag ]);

  d.stdout.on('data', log);
  d.stderr.on('data', log);
  d.on('error', (err) => {
    log(`Error spawning docker process: ${util.inspect(err)}`);
    assert.ifError(err);
  });

  // if using docker-machine, grab the hostname
  let host = 'localhost';
  if (process.env.DOCKER_HOST) {
    host = (process.env.DOCKER_HOST as string).split('//')[1].split(':')[0];
  }

  callback(host);
}

function cleanDirectory(dirPath: string, cb: (err: Error|null) => void): void {
  const dockerfile = path.join(dirPath, 'Dockerfile');
  const dockerignore = path.join(dirPath, '.dockerignore');
  fs.unlink(dockerfile, (err1) => {
    // It is ok if the file could not be deleted because it doesn't exist.
    if (err1 && err1.code !== 'ENOENT') {
      return cb(err1);
    }

    fs.unlink(dockerignore, (err2) => {
      // Again it is ok if the file does not exist.
      if (err2 && err2.code !== 'ENOENT') {
        return cb(err2);
      }

      return cb(null);
    });
  });
}

describe('runtime image and builder integration', () => {
  before((done) => {
    dockerBuild(RUNTIME_TAG,
                path.join(__dirname, '..', '..', '..', 'runtime-image'),
                (err1) => {
                  if (err1) {
                    return done(err1);
                  }
                  buildGenDockerfile(done);
                });
  });

  CONFIGURATIONS.forEach((config) => {
    describe(`For directory ${config.directoryName}`, () => {
      const containerName = uuid.v4();
      const appDir = path.join(__dirname, '..', '..', 'test', 'definitions',
                               config.directoryName);
      const tag = `${TAG_PREFIX}/${config.directoryName}`;
      before((done) => {
        cleanDirectory(appDir, (err) => {
          if (err) {
            return done(err);
          }

          run('node',
              [
                GEN_DOCKERFILE_FILE, '--runtime-image', RUNTIME_TAG,
                '--app-dir', appDir
              ],
              {stdio : 'inherit', cwd : appDir}, (err) => {
                if (err) {
                  return done(err);
                }

                dockerBuild(tag, appDir, done);
              });
        });
      });

      it(`Should output '${config.expectedOutput}'`, function(done) {
        this.timeout(2 * TIMEOUT);
        runDocker(tag, containerName, PORT, host => {
          // Wait for the docker container to start
          setTimeout(() => {
            request(`http://${host}:${PORT}`, (err, _, body) => {
              assert.ifError(err);
              assert.equal(body, config.expectedOutput);
              done();
            });
          }, TIMEOUT);
        });
      });

      after(done => {
        exec(`docker stop ${containerName}`, (err, stdout, stderr) => {
          log(stdout);
          log(stderr);
          assert.ifError(err);
          done();
        });
      });
    });
  });
});
