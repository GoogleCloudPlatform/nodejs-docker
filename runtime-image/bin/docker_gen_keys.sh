#!/bin/bash

# This script runs the `gen_keys.sh` script in a fresh Debian 8 container
# so that a fresh Debian 8 installation of gpg is necessarily used to
# generate the keys.  The script will generate a new ../contents/KEYS file
# and will confirm before overwriting the file.

# fail-fast
set -e

# Change the current working directory to the `base` directory instead of
# the `base/bin` directory
pushd $(dirname $0)/.. > /dev/null

DIR=$(pwd)
echo ${DIR}
TAG=nodejs-docker_gen_keys
docker build -f bin/Dockerfile.gen_keys -t ${TAG} ${DIR}
docker run -v ${DIR}:/workspace -it --rm ${TAG}
