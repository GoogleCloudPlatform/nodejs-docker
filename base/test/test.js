'use strict';

const assert = require('assert');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const request = require('request');
const util = require('util');
const uuid = require('node-uuid');

describe('nodejs-docker', () => {

  function verifyOutput(description, dockerImage, expectedOutput) {
    it(description, (done) => {
      runDocker(dockerImage, 8080, (host, callback) => {
        setTimeout(() => {
          request(`http://${host}:8080`, (err, res, body) => {
            assert.ifError(err);
            assert.equal(body, expectedOutput);
            callback(done);
          });
        }, 3000);
      });
    });
  }

  verifyOutput('serves traffic on 8080',
               'test/express',
               'Hello World!');

  verifyOutput('install_node installs and verifies deprecated verifiable ' +
               'Node versions',
               'test/old-verifiable-node',
               'v0.8.10');
  
  verifyOutput('install_node still installs deprecated versions of ' +
               'Node even if they cannot be verified ',
               'test/old-unverifiable-node',
               'v0.8.7');

  verifyOutput('install_node installs and verifies verifiable Node versions',
               'test/verifiable-node',
               'v6.0.0');

  verifyOutput('install_node still installs Node even if it cannot ' +
               'be verified',
               'test/unverifiable-node',
               'v0.10.7');

  verifyOutput('verify_node has a non-zero exit code if it is not supplied ' +
               'the files it need for verification',
               'test/verify-fail-without-files',
               'Correctly failed verification');

  verifyOutput('verify_node has a non-zero exit code if the checksum ' +
               'check fails',
               'test/verify-fail-on-invalid-data',
               'Correctly failed verification');
});

/**
 * Start a docker process for the given test
 */
function runDocker(tag, port, callback) {
  let name = uuid.v4();
  let d = spawn('docker', [
    'run', '--rm', '-i', '--name', name, '-p', `${port}:${port}`, tag
  ]);

  d.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  d.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  d.on('error', (err) => { 
    console.error(`Error spawning docker process: ${util.inspect(err)}`); 
    throw err;
  });

  // if using docker-machine, grab the hostname
  let host = 'localhost';
  if (process.env.DOCKER_HOST) {
    host = process.env.DOCKER_HOST.split('//')[1].split(':')[0];
  }

  console.log(`host: ${host}`);
  callback(host, (callback) => {
    console.log('stopping docker process...');
    exec(`docker stop ${name}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${error}`);
      }
      else{
        console.log('docker process stopped.');
      }
      callback();
    });
  });  
}
