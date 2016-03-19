'use strict';

const assert = require('assert');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const request = require('request');
const util = require('util');

describe('nodejs-docker', () => {

  it('serves traffic on 8080', (done) => {
    runDocker('test/express', 8080, (host, callback) => {
      setTimeout(() => {
        request(`http://${host}:8080`, (err, res, body) => {
          if (err) {
            console.error(`Error requesting content: ${util.inspect(err)}`);
            throw err;
          }
          assert.equal(body, 'Hello World!');
          callback(() => {
            done();
          });
        });
      }, 3000);
    });
  });

  it('can use a custom nodejs version', (done) => {
    runDocker('test/nodeversion', 3000, (host, callback) => {
      setTimeout(() => {
        request(`http://${host}:3000`, (err, res, body) => {
          if (err) {
            console.error(`Error requesting content: ${util.inspect(err)}`);
            throw err;
          }
          assert.equal(body, 'v5.9.0');
          callback(() => {
            done();
          });
        });
      }, 3000);
    });
  });

});

/**
 * Start a docker process for the given test
 */
function runDocker(tag, port, callback) {
  let d = spawn('docker', [
    'run', '-i', '-p', `${port}:${port}`, tag
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
    exec('docker stop $(docker ps -q)', (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${error}`);
      }
      console.log('docker process stopped.');
      callback();
    });
    //d.kill(); // this isn't killing the process
  });  
}
