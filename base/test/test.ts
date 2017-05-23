
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
    tag : 'test/definitions/express',
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
  },
  {
    description: 'install_node installs and verifies deprecated verifiable ' +
                   'Node versions',
    tag: 'test/definitions/old-verifiable-node',
    expectedOutput: 'v0.8.10'
  },
  {
    description: 'install_node still installs deprecated versions of ' +
                   'Node even if they cannot be verified ',
    tag: 'test/definitions/old-unverifiable-node',
    expectedOutput: 'v0.8.7'
  },
  {
    description: 'install_node installs and verifies verifiable Node versions',
    tag: 'test/definitions/verifiable-node',
    expectedOutput: 'v6.0.0'
  },
  {
    description: 'install_node still installs Node even if it cannot ' +
                   'be verified',
    tag: 'test/definitions/unverifiable-node',
    expectedOutput: 'v0.10.7'
  },
  {
    description: 'verify_node has a non-zero exit code if it is not supplied ' +
                   'the files it need for verification',
    tag: 'test/definitions/verify-fail-without-files',
    expectedOutput: 'Correctly failed verification'
  },
  {
    description: 'verify_node has a non-zero exit code if the checksum ' +
                   'check fails',
    tag: 'test/definitions/verify-fail-on-invalid-data',
    expectedOutput: 'Correctly failed verification'
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
