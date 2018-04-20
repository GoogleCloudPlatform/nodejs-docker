
import * as assert from 'assert';
import * as Docker from 'dockerode';
import * as path from 'path';
import * as request from 'request';

const tar: {pack: (dir: string) => NodeJS.ReadableStream} = require('tar-fs');

const RUN_TIMEOUT_MS = 3000;
const BUILD_TIMEOUT_MS = 5 * 60 * 1000;
const PORT = 8080;

const host = process.env.DOCKER_HOST ?
    process.env.DOCKER_HOST.split('//')[1].split(':')[0] :
    'localhost';

const DOCKER = new Docker(
    {socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'});

const ROOT = path.join(__dirname, '..', '..');

const DEBUG = false;
function log(message?: string): void {
  if (DEBUG && message) {
    process.stdout.write(message.endsWith('\n') ? message : message + '\n');
  }
}

const GPG_KEYS = `/tmp/keys
---------
pub   rsa4096/7434390BDBE9B9C5 2015-07-21 [SC] [expires: 2019-07-21]
      94AE36675C464D64BAFA68DD7434390BDBE9B9C5
uid                 [ unknown] Colin Ihrig <cjihrig@gmail.com>
sub   rsa4096/4FEC3ECC9B596CE2 2015-07-21 [E] [expires: 2019-07-21]

pub   rsa4096/09FE44734EB7990E 2014-04-01 [SCEA] [expires: 2024-03-29]
      FD3A5288F042B6850C66B31F09FE44734EB7990E
uid                 [ unknown] Jeremiah Senkpiel <fishrock123@rocketmail.com>
uid                 [ unknown] keybase.io/fishrock <fishrock@keybase.io>
sub   rsa4096/45F5EEBD813DAE8E 2014-04-01 [SEA] [expires: 2024-03-29]

pub   rsa4096/C97EC7A07EDE3FC1 2014-11-10 [SCEA]
      71DCFD284A79C3B38668286BC97EC7A07EDE3FC1
uid                 [ unknown] keybase.io/jasnell <jasnell@keybase.io>
uid                 [ unknown] James M Snell <jasnell@gmail.com>
uid                 [ unknown] James M Snell <jasnell@us.ibm.com>
sub   rsa2048/7341B15C070877AC 2014-11-10 [S] [expires: 2022-11-08]
sub   rsa2048/8975BA8B6100C6B1 2014-11-10 [E] [expires: 2022-11-08]

pub   rsa2048/C273792F7D83545D 2013-11-18 [SC]
      DD8F2338BAE7501E3DD5AC78C273792F7D83545D
uid                 [ unknown] Rod Vagg <rod@vagg.org>
uid                 [ unknown] Rod Vagg <r@va.gg>
sub   rsa2048/1BDC911B8B6AED76 2013-11-18 [E]

pub   rsa4096/E73BC641CC11F4C8 2016-01-12 [SC]
      C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8
uid                 [ unknown] Myles Borins <myles.borins@gmail.com>
uid                 [ unknown] Myles Borins <mborins@google.com>
uid                 [ unknown] Myles Borins <mylesborins@google.com>
uid                 [ unknown] Myles Borins (Not used after January 2017) <mborins@us.ibm.com>
sub   rsa2048/DEA16371974031A5 2016-01-12 [E] [expires: 2024-01-10]
sub   rsa2048/933B01F40B5CA946 2016-01-12 [SA] [expires: 2024-01-10]

pub   rsa4096/B63B535A4C206CA9 2015-12-17 [SC] [expires: 2019-12-17]
      B9AE9905FFD7803F25714661B63B535A4C206CA9
uid                 [ unknown] Evan Lucas <evanlucas@me.com>
uid                 [ unknown] Evan Lucas <evanlucas@keybase.io>
sub   rsa4096/A39CBCAE8D765781 2015-12-17 [E] [expires: 2019-12-17]

pub   rsa4096/23EFEFE93C4CFFFE 2017-01-23 [SC] [expires: 2033-01-19]
      56730D5401028683275BD23C23EFEFE93C4CFFFE
uid                 [ unknown] Italo A. Casas <me@italoacasas.com>
sub   rsa4096/D3C55C2AAEC2131D 2017-01-23 [E] [expires: 2033-01-19]

pub   rsa2048/6D5A82AC7E37093B 2015-02-03 [SC]
      9554F04D7259F04124DE6B476D5A82AC7E37093B
uid                 [ unknown] Christopher Dickinson <christopher.s.dickinson@gmail.com>
sub   rsa2048/3F4049298959D8C2 2015-02-03 [E]

pub   rsa2048/B0A78B0A6C481CF6 2010-08-31 [SC]
      93C7E9E91B49E432C2F75674B0A78B0A6C481CF6
uid                 [ unknown] isaacs (http://blog.izs.me/) <i@izs.me>
sub   rsa2048/12DAF9ECEDE8123E 2010-08-31 [E]

pub   rsa4096/50A3051F888C628D 2015-01-08 [SC] [expires: 2019-01-08]
      114F43EE0176B71C7BC219DD50A3051F888C628D
uid                 [ unknown] Julien Gilli <jgilli@fastmail.fm>
sub   rsa4096/926EC77D21D4BD24 2015-01-08 [E] [expires: 2019-01-08]

pub   dsa1024/7D33FF9D0246406D 2006-01-18 [SC] [expired: 2016-03-26]
      7937DFD2AB06298B2293C3187D33FF9D0246406D
uid                 [ expired] Timothy J Fontaine (Personal) <tjfontaine@gmail.com>
uid                 [ expired] Timothy J Fontaine (OFTC) <tjfontaine@oftc.net>
uid                 [ expired] Timothy J Fontaine (Work) <tj.fontaine@joyent.com>
uid                 [ expired] Timothy J Fontaine (Personal Key) <tjfontaine@atxconsulting.com>

pub   rsa4096/B01FBB92821C587A 2016-10-07 [SC]
      77984A986EBC2AA786BC0F66B01FBB92821C587A
uid                 [ unknown] Gibson Fahnestock <gibfahn@gmail.com>
sub   rsa4096/919AC8A92C482931 2016-10-07 [E]`;

interface TestConfig {
  description: string;
  tag: string;
  expectedOutput: string;
}

const CONFIGURATIONS: TestConfig[] = [
  {
    description: `serves traffic on port ${PORT}`,
    tag: 'test/definitions/express',
    expectedOutput: 'Hello World!'
  },
  {
    description: 'can install yarn locally',
    tag: 'test/definitions/yarn-local',
    expectedOutput: '0.18.0\n'
  },
  {
    description: 'can install yarn globally',
    tag: 'test/definitions/yarn-global',
    expectedOutput: '0.18.0\n'
  },
  {
    description: 'install_node installs and verifies verifiable Node versions',
    tag: 'test/definitions/verifiable-node',
    expectedOutput: 'v6.0.0'
  },
  {
    description: 'install_node still installs Node even if it cannot ' +
        'be verified if --ingore-verification-failure is specified',
    tag: 'test/definitions/unverifiable-node',
    expectedOutput: 'v0.10.7'
  },
  {
    description: 'install_node aborts the installation if verification fails ' +
        'and --ingore-verification-failure is not specified',
    tag: 'test/definitions/verify-fail-aborts-install',
    expectedOutput: 'v6.10.3'
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
  },
  {
    description: 'verify the set of keys in the keyring',
    tag: 'test/definitions/verify-gpg-keyring',
    expectedOutput: GPG_KEYS
  }
];

describe('runtime image', () => {
  before(async function() {
    this.timeout(BUILD_TIMEOUT_MS);
    await buildDocker(ROOT, 'test/nodejs');
    const dir = path.join(ROOT, 'test', 'definitions', 'base-install-node');
    await buildDocker(dir, 'test/definitions/base-install-node');
  });

  CONFIGURATIONS.forEach(config => {
    describe(`Image ${config.tag}`, () => {
      let container: Docker.Container|undefined;
      before(async function() {
        this.timeout(BUILD_TIMEOUT_MS);
        // converts a/b/c to a/b/c on Unix and a\b\c on Windows
        const sysDepPath = path.join.apply(null, config.tag.split('/'));
        const dir = path.join(ROOT, sysDepPath);
        await buildDocker(dir, config.tag);
        container = await runDocker(config.tag, PORT);
      });

      it(config.description, function(done) {
        this.timeout(2 * RUN_TIMEOUT_MS);
        setTimeout(() => {
          request(`http://${host}:${PORT}`, (err, _, body) => {
            assert.ifError(err);
            assert.equal(body, config.expectedOutput);
            done();
          });
        }, RUN_TIMEOUT_MS);
      });

      after(async () => {
        if (container) {
          await container.stop();
          await container.remove();
        }
      });
    });
  });
});

async function buildDocker(dir: string, tag: string): Promise<{}> {
  const tarStream = tar.pack(dir);
  const stream = await DOCKER.buildImage(tarStream, {t: tag});

  let resolve: (output: {}) => void;
  let reject: (err: Error) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  function onFinished(err: Error, output: {}) {
    if (err) {
      return reject(err);
    }

    resolve(output);
  }

  function onProgress(
      event: {stream?: string; status?: string; progress?: string;}) {
    log(event.stream);
    log(event.status);
    log(event.progress);
  }

  DOCKER.modem.followProgress(stream, onFinished, onProgress);
  return promise;
}

async function runDocker(tag: string, port: number): Promise<Docker.Container> {
  const container = await DOCKER.createContainer({
    Image: tag,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    ExposedPorts: {[`${port}/tcp`]: {}},
    HostConfig: {PortBindings: {[`${port}/tcp`]: [{HostPort: `${port}`}]}}
  });
  await container.start();
  return container;
}
