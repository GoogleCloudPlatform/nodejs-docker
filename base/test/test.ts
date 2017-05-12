
import * as assert from 'assert';
import {spawn} from 'child_process';
import {exec} from 'child_process';
import * as uuid from 'node-uuid';
import * as request from 'request';
import * as util from 'util';

describe('nodejs-docker', () => {
  it('serves traffic on 8080', (done) => {
    runDocker('test/express', 8080, (host, callback) => {
      setTimeout(() => {
        request(`http://${host}:8080`, (err, _, body) => {
          assert.ifError(err);
          assert.equal(body, 'Hello World!');
          callback(done);
        });
      }, 3000);
    });
  });
});

/**
 * Start a docker process for the given test
 */
function runDocker(tag: string, port: number,
                   callback: (host: string, cb: (fn: () => void) => void) =>
                       void) {
  let name = uuid.v4();
  let d = spawn(
      'docker',
      [ 'run', '--rm', '-i', '--name', name, '-p', `${port}:${port}`, tag ]);

  d.stdout.on('data', (data) => { console.log(`stdout: ${data}`); });

  d.stderr.on('data', (data) => { console.error(`stderr: ${data}`); });

  d.on('error', (err) => {
    console.error(`Error spawning docker process: ${util.inspect(err)}`);
    assert.ifError(err);
  });

  // if using docker-machine, grab the hostname
  let host = 'localhost';
  if (process.env.DOCKER_HOST) {
    host = process.env.DOCKER_HOST.split('//')[1].split(':')[0];
  }

  console.log(`host: ${host}`);
  callback(host, cb => {
    console.log('stopping docker process...');
    exec(`docker stop ${name}`, (err, stdout, stderr) => {
      console.log(stdout);
      console.error(stderr);
      console.log('docker process stopped.');
      assert.ifError(err);
      cb();
    });
  });
}
