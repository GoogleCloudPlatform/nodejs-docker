
# Google Cloud Platform Node.js Docker Image Developer's Guide

## Adding a New Node.js Release Key

The runtime image provides an `install_node` script that can be used to install custom versions of Node.js.  This script uses the [bootstrap_node](./runtime-image/contents/bootstrap_node) script (which uses the [verify_node](./runtime-image/contents/verify_node) script) to download the requested version of Node.js and uses `gpg` to verify that the downloaded file was signed by a trusted key.

If a new person is added to the Node.js release team, their key will need to be added to the [KEYS](runtime-image/contents/KEYS) file, and a new runtime image will need to be released that includes the new key.

As an example, [node PR #16620](https://github.com/nodejs/node/pull/16620) added Gibson Fahnestock to Release team.  The pull request specified that their key can be used via:
```
 gpg --keyserver pool.sks-keyservers.net --recv-keys 77984A986EBC2AA786BC0F66B01FBB92821C587A
```

To update the runtime image's [KEYS](runtime-image/contents/KEYS) file to use this user's key, update the [gen_keys.sh](./runtime-image/bin/gen_keys.sh) to add the key `77984A986EBC2AA786BC0F66B01FBB92821C587A` to the `keylist` array.

Then manually run the [docker_gen_keys.sh](./runtime-image/bin/docker_gen_keys.sh) script to generate a new [KEYS](runtime-image/contents/KEYS) file.  The script will generate the keys within a Debian 8 Docker container to ensure a fresh installation of `gpg` is used when generating the keys.

The script will also output the new list of keys.  You will need to update the `GPG_KEYS` variable in the [runtime-image/test/test.ts](./runtime-image/test/test.ts) file to include the information about the newly added key.  This is needed since the [test.ts](./runtime-image/test/test.ts) file contains a test that verifies that the only keys available in the runtime image are trusted keys used to sign Node.js releases.

If possible, you should also create a structure test in [test_config.yaml](./runtime-image/test/test_config.yaml) that verifies that key can be used to install a version of Node signed with the new key.
