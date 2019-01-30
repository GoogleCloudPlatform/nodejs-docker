
import * as assert from 'assert';
import * as Docker from 'dockerode';
import * as path from 'path';
import * as request from 'request';

const tar: {pack: (dir: string) => NodeJS.ReadableStream} = require('tar-fs');

const RUN_TIMEOUT_MS = 3000;
const BUILD_TIMEOUT_MS = 5 * 60 * 1000;
const PORT = 8080;

const host = process.env.DOCKER_HOST ?
    process.env.DOCKER_HOST!.split('//')[1].split(':')[0] :
    'localhost';

const DOCKER = new Docker(
    {socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'});

const ROOT = path.join(__dirname, '..', '..');

const DEBUG = true;
function log(message?: string): void {
  if (DEBUG && message) {
    process.stdout.write(message.endsWith('\n') ? message : message + '\n');
  }
}

const GPG_KEYS = `/tmp/keys
---------
pub   4096R/7434390BDBE9B9C5 2015-07-21 [expires: 2019-07-21]
uid                          Colin Ihrig <cjihrig@gmail.com>
sub   4096R/4FEC3ECC9B596CE2 2015-07-21 [expires: 2019-07-21]

pub   4096R/B63B535A4C206CA9 2015-12-17 [expires: 2019-12-17]
uid                          Evan Lucas <evanlucas@me.com>
uid                          Evan Lucas <evanlucas@keybase.io>
sub   4096R/A39CBCAE8D765781 2015-12-17 [expires: 2019-12-17]

pub   4096R/B01FBB92821C587A 2016-10-07
uid                          Gibson Fahnestock <gibfahn@gmail.com>
sub   4096R/919AC8A92C482931 2016-10-07

pub   4096R/C97EC7A07EDE3FC1 2014-11-10
uid                          keybase.io/jasnell <jasnell@keybase.io>
uid                          James M Snell <jasnell@gmail.com>
uid                          James M Snell <jasnell@us.ibm.com>
sub   2048R/7341B15C070877AC 2014-11-10 [expires: 2022-11-08]
sub   2048R/8975BA8B6100C6B1 2014-11-10 [expires: 2022-11-08]

pub   4096R/09FE44734EB7990E 2014-04-01 [expires: 2024-03-29]
uid                          Jeremiah Senkpiel <fishrock123@rocketmail.com>
uid                          keybase.io/fishrock <fishrock@keybase.io>
sub   4096R/45F5EEBD813DAE8E 2014-04-01 [expires: 2024-03-29]

pub   4096R/770F7A9A5AE15600 2016-04-07
uid                          Micha�l Zasso (Targos) <targos@protonmail.com>
sub   4096R/4708964F8085DFE7 2016-04-07

pub   4096R/E73BC641CC11F4C8 2016-01-12
uid                          Myles Borins <myles.borins@gmail.com>
uid                          Myles Borins <mborins@google.com>
uid                          Myles Borins <mylesborins@google.com>
sub   2048R/933B01F40B5CA946 2016-01-12 [expires: 2024-01-10]
sub   2048R/A250501325FA7297 2018-10-31 [expires: 2022-10-31]

pub   2048R/C273792F7D83545D 2013-11-18
uid                          Rod Vagg <rod@vagg.org>
uid                          Rod Vagg <r@va.gg>
sub   2048R/1BDC911B8B6AED76 2013-11-18

pub   2048R/6D5A82AC7E37093B 2015-02-03
uid                          Christopher Dickinson <christopher.s.dickinson@gmail.com>
sub   2048R/3F4049298959D8C2 2015-02-03

pub   2048R/B0A78B0A6C481CF6 2010-08-31
uid                          isaacs (http://blog.izs.me/) <i@izs.me>
sub   2048R/12DAF9ECEDE8123E 2010-08-31

pub   4096R/23EFEFE93C4CFFFE 2017-01-23 [expires: 2033-01-19]
uid                          Italo A. Casas <me@italoacasas.com>
sub   4096R/D3C55C2AAEC2131D 2017-01-23 [expires: 2033-01-19]

pub   4096R/50A3051F888C628D 2015-01-08 [expired: 2019-01-08]
uid                          Julien Gilli <jgilli@fastmail.fm>

pub   1024D/7D33FF9D0246406D 2006-01-18 [expired: 2016-03-26]
uid                          Timothy J Fontaine (Personal) <tjfontaine@gmail.com>
uid                          Timothy J Fontaine (OFTC) <tjfontaine@oftc.net>
uid                          Timothy J Fontaine (Work) <tj.fontaine@joyent.com>
uid                          Timothy J Fontaine (Personal Key) <tjfontaine@atxconsulting.com>

pub   2048R/D7062848A1AB005C 2018-03-26 [expires: 2020-03-25]
uid                          Beth Griggs <Bethany.Griggs@uk.ibm.com>
sub   2048R/B2CCB982D6DCC25D 2018-03-26 [expires: 2020-03-25]

pub   4096R/F07496B3EB3C1762 2016-12-08 [expires: 2021-12-07]
uid                          Ruben Bridgewater <ruben@bridgewater.de>
sub   4096R/F320153C71827C7B 2016-12-08 [expires: 2021-12-07]

pub   4096R/F13993A75599653C 2017-07-28
uid                          Shelley Vohr (security is major key) <shelley.vohr@gmail.com>
sub   4096R/3049F7B98AED0C89 2017-07-28`;

interface TestConfig {
  description: string;
  tag: string;
  expectedOutput: string;
}

const CONFIGURATIONS: TestConfig[] = [
  {
    description: `serves traffic on port ${PORT} using 'http'`,
    tag: 'test/definitions/http',
    expectedOutput: `Hello World from port ${PORT}`
  },
  {
    description: `serves traffic on port ${PORT} using 'express'`,
    tag: 'test/definitions/express',
    expectedOutput: 'Hello World!'
  },
  {
    description: 'can install yarn locally',
    tag: 'test/definitions/yarn-local',
    expectedOutput: '1.13.0\n'
  },
  {
    description: 'can install yarn globally',
    tag: 'test/definitions/yarn-global',
    expectedOutput: '1.12.3\n'
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
  },
  {
    description: 'verify list of available versions is properly sorted',
    tag: 'test/definitions/verify-version-sort',
    expectedOutput: 'v9.11.2'
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
