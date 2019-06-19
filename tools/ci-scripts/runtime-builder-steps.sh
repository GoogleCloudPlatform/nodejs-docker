#!/bin/bash
export KOKORO_GITHUB_DIR=${KOKORO_ROOT}/src/github
source ${KOKORO_GFILE_DIR}/kokoro/common.sh

cd ${KOKORO_GITHUB_DIR}/nodejs-docker
./builder/bin/build.sh ${BUILDER_NAMESPACE} ${BUILDER_TAG} ${UPLOAD_TO_STAGING}
