#!/bin/bash
set -ex
export KOKORO_GITHUB_DIR=${KOKORO_ROOT}/src/github
source ${KOKORO_GFILE_DIR}/kokoro/common.sh

cd ${KOKORO_GITHUB_DIR}/nodejs-docker
./runtime-image/bin/build.sh --docker-namespace="${DOCKER_NAMESPACE}" \
                             --candidate-name="${TAG}" \
                             --node-version="${NODE_VERSION_TAG}" \
                             --upload-to-staging="${UPLOAD_TO_STAGING}" \
                             --verbose
METADATA=$(pwd)/METADATA
cd ${KOKORO_GFILE_DIR}/kokoro
python note.py nodejs -m ${METADATA} -t ${TAG}
