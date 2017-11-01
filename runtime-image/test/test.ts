
import * as assert from 'assert';
import * as async from 'async';
import {spawn} from 'child_process';
import {exec} from 'child_process';
import * as fs from 'fs';
import * as uuid from 'node-uuid';
import * as path from 'path';
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

const GPG_KEYS = `/tmp/keys
---------
pub   4096R/7434390BDBE9B9C5 2015-07-21 [expires: 2019-07-21]
uid                          Colin Ihrig <cjihrig@gmail.com>
sub   4096R/4FEC3ECC9B596CE2 2015-07-21 [expires: 2019-07-21]

pub   4096R/09FE44734EB7990E 2014-04-01 [expires: 2024-03-29]
uid                          Jeremiah Senkpiel <fishrock123@rocketmail.com>
uid                          keybase.io/fishrock <fishrock@keybase.io>
sub   4096R/45F5EEBD813DAE8E 2014-04-01 [expires: 2024-03-29]

pub   4096R/C97EC7A07EDE3FC1 2014-11-10
uid                          keybase.io/jasnell <jasnell@keybase.io>
uid                          James M Snell <jasnell@gmail.com>
uid                          James M Snell <jasnell@us.ibm.com>
sub   2048R/7341B15C070877AC 2014-11-10 [expires: 2022-11-08]
sub   2048R/8975BA8B6100C6B1 2014-11-10 [expires: 2022-11-08]

pub   2048R/C273792F7D83545D 2013-11-18
uid                          Rod Vagg <rod@vagg.org>
uid                          Rod Vagg <r@va.gg>
sub   2048R/1BDC911B8B6AED76 2013-11-18

pub   4096R/E73BC641CC11F4C8 2016-01-12
uid                          Myles Borins <myles.borins@gmail.com>
uid                          Myles Borins <mborins@google.com>
uid                          Myles Borins <mylesborins@google.com>
uid                          Myles Borins (Not used after January 2017) <mborins@us.ibm.com>
sub   2048R/DEA16371974031A5 2016-01-12 [expires: 2024-01-10]
sub   2048R/933B01F40B5CA946 2016-01-12 [expires: 2024-01-10]

pub   4096R/B63B535A4C206CA9 2015-12-17 [expires: 2019-12-17]
uid                          Evan Lucas <evanlucas@me.com>
uid                          Evan Lucas <evanlucas@keybase.io>
sub   4096R/A39CBCAE8D765781 2015-12-17 [expires: 2019-12-17]

pub   4096R/23EFEFE93C4CFFFE 2017-01-23 [expires: 2033-01-19]
uid                          Italo A. Casas <me@italoacasas.com>
sub   4096R/D3C55C2AAEC2131D 2017-01-23 [expires: 2033-01-19]

pub   2048R/6D5A82AC7E37093B 2015-02-03
uid                          Christopher Dickinson <christopher.s.dickinson@gmail.com>
sub   2048R/3F4049298959D8C2 2015-02-03

pub   2048R/B0A78B0A6C481CF6 2010-08-31
uid                          isaacs (http://blog.izs.me/) <i@izs.me>
sub   2048R/12DAF9ECEDE8123E 2010-08-31

pub   4096R/50A3051F888C628D 2015-01-08 [expires: 2019-01-08]
uid                          Julien Gilli <jgilli@fastmail.fm>
sub   4096R/926EC77D21D4BD24 2015-01-08 [expires: 2019-01-08]

pub   1024D/7D33FF9D0246406D 2006-01-18 [expired: 2016-03-26]
uid                          Timothy J Fontaine (Personal) <tjfontaine@gmail.com>
uid                          Timothy J Fontaine (OFTC) <tjfontaine@oftc.net>
uid                          Timothy J Fontaine (Work) <tj.fontaine@joyent.com>
uid                          Timothy J Fontaine (Personal Key) <tjfontaine@atxconsulting.com>

pub   4096R/B01FBB92821C587A 2016-10-07
uid                          Gibson Fahnestock <gibfahn@gmail.com>
sub   4096R/919AC8A92C482931 2016-10-07`;

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
    tag : 'test/definitions/yarn-local',
    expectedOutput : '0.18.0\n'
  },
  {
    description : 'can install yarn globally',
    tag : 'test/definitions/yarn-global',
    expectedOutput : '0.18.0\n'
  },
  {
    description : 'install_node installs and verifies verifiable Node versions',
    tag : 'test/definitions/verifiable-node',
    expectedOutput : 'v6.0.0'
  },
  {
    description :
        'install_node still installs Node even if it cannot ' +
            'be verified if --ingore-verification-failure is specified',
    tag : 'test/definitions/unverifiable-node',
    expectedOutput : 'v0.10.7'
  },
  {
    description :
        'install_node aborts the installation if verification fails ' +
            'and --ingore-verification-failure is not specified',
    tag : 'test/definitions/verify-fail-aborts-install',
    expectedOutput : 'v6.10.3'
  },
  {
    description :
        'verify_node has a non-zero exit code if it is not supplied ' +
            'the files it need for verification',
    tag : 'test/definitions/verify-fail-without-files',
    expectedOutput : 'Correctly failed verification'
  },
  {
    description : 'verify_node has a non-zero exit code if the checksum ' +
                      'check fails',
    tag : 'test/definitions/verify-fail-on-invalid-data',
    expectedOutput : 'Correctly failed verification'
  },
  {
    description : 'verify the set of keys in the keyring',
    tag : 'test/definitions/verify-gpg-keyring',
    expectedOutput : GPG_KEYS
  }
];

describe('runtime-image', () => {
  before((done) => { prepareTest(done); });

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

function dockerBuild(tag: string, baseDir: string,
                     cb: (err: Error|null) => void): void {
  spawn('docker', [ 'build', '-t', tag, baseDir ], {
    stdio : 'inherit'
  }).on('close', cb);
}

function prepareTest(cb: (err1: Error|null) => void): void {
  const baseDir = path.join(__dirname, '..', '..');
  const testDir = path.join(baseDir, 'test', 'definitions');
  dockerBuild('test/nodejs', baseDir, () => {
    fs.readdir(testDir, 'utf8', (err2, items) => {
      if (err2) {
        return cb(err2);
      }

      const buildDirs =
          items
              .filter(pathname => {
                // TODO: When the infrastructure is available, update
                //       the tests so that integration testing is
                //       also done.
                return pathname !== 'integration' &&
                       fs.lstatSync(path.join(testDir, pathname)).isDirectory();
              })
              .map(pathname => {
                return () => {
                  dockerBuild(`test/definitions/${pathname}`,
                              path.join(testDir, pathname), cb);
                };
              });

      async.series(buildDirs, (err3: Error|null) => { cb(err3); });
    });
  });
}
