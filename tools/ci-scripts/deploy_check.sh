#!/bin/bash

set -ex

export KOKORO_GITHUB_DIR=${KOKORO_ROOT}/src/github
source ${KOKORO_GFILE_DIR}/kokoro/common.sh

cd ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}
if [ -n "${RUNTIME_SPEC}" -a -f app.yaml.in ]; then
  sed "s|\${RUNTIME_SPEC}|${RUNTIME_SPEC}|" app.yaml.in > app.yaml
fi

cd ${KOKORO_GFILE_DIR}/appengine/integration_tests

sudo /usr/local/bin/pip install --upgrade -r requirements.txt

if [ -f ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}/requirements.txt ]
then
  sudo /usr/local/bin/pip install --upgrade -r ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}/requirements.txt
fi

export DEPLOY_LATENCY_PROJECT='cloud-deploy-latency'

skip_flag=""

if [ "${SKIP_CUSTOM_LOGGING_TESTS}" = "true" -o "${SKIP_BUILDERS}" = "true" ]; then
  skip_flag="$skip_flag --skip-builders"
fi

if [ "${SKIP_XRT}" = "true" ]; then
  skip_flag="$skip_flag --skip-xrt"
fi

python deploy_check.py -d ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY} -l ${LANGUAGE} ${skip_flag}
