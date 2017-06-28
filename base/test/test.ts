
import * as assert from 'assert';
import {spawn} from 'child_process';
import {exec} from 'child_process';
import * as uuid from 'node-uuid';
import * as request from 'request';
import * as util from 'util';

const DEBUG = false;
function log(message: string): void {
  if (DEBUG) {
    console.log(message);
  }
}

const TIMEOUT = 3000;
const PORT = 8080;

interface TestConfig {
  description: string;
  tag: string;
  expectedOutput: string;
}

const CONFIGURATIONS: TestConfig[] = [
  {
    description : `serves traffic on port ${PORT}`,
    tag : 'test/express',
    expectedOutput : 'Hello World!'
  },
  {
    description : 'can install yarn locally',
    tag : 'test/yarn-local',
    expectedOutput : '0.18.0\n'
  },
  {
    description : 'can install yarn globally',
    tag : 'test/yarn-global',
    expectedOutput : '0.18.0\n'
  }
];

CONFIGURATIONS.forEach(config => {
  describe(`nodejs-docker: Image ${config.tag}`, () => {
    const containerName = uuid.v4();
    it(config.description, function(done) {
      this.timeout(2 * TIMEOUT);
      runDocker(config.tag, containerName, PORT, host => {
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
    host = process.env.DOCKER_HOST.split('//')[1].split(':')[0];
  }

  callback(host);
}
