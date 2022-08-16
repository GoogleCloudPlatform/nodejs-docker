#!/bin/bash

set -ex

export KOKORO_GITHUB_DIR=${KOKORO_ROOT}/src/github
source ${KOKORO_GFILE_DIR}/kokoro/common.sh

export GOOGLE_CLOUD_PROJECT=gcp-runtimes

sudo -E /usr/local/bin/pip install --upgrade -r ${KOKORO_GFILE_DIR}/appengine/integration_tests/requirements.txt

if [ -f ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}/requirements.txt ]
then
  sudo -E /usr/local/bin/pip install --upgrade -r ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}/requirements.txt
fi

export GOPATH=${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}

flags=""

if [ -n "${STAGING_IMAGE}" ]; then
  flags="$flags -i ${STAGING_IMAGE}"
fi

if [ "${SKIP_STANDARD_LOGGING_TESTS}" = "true" ]; then
  flags="$flags --skip-standard-logging-tests"
fi

if [ "${SKIP_CUSTOM_LOGGING_TESTS}" = "true" ]; then
  flags="$flags --skip-custom-logging-tests"
fi

if [ "${SKIP_MONITORING_TESTS}" = "true" ]; then
  flags="$flags --skip-monitoring-tests"
fi

if [ "${SKIP_EXCEPTION_TESTS}" = "true" ]; then
  flags="$flags --skip-exception-tests"
fi

if [ "${SKIP_CUSTOM_TESTS}" = "true" ]; then
  flags="$flags --skip-custom-tests"
fi

if [ -n "${URL}" ]; then
  flags="$flags --url ${URL}"
fi

if [ -n "${BUILDER}" ]; then
  flags="$flags --builder ${BUILDER}"
  gcloud config set app/use_runtime_builders True
  gcloud config set app/runtime_builders_root file://${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY}
fi

if [ -n "${YAML}" ]; then
  flags="$flags --yaml ${KOKORO_GITHUB_DIR}/${YAML}"
fi


chmod a+x ${KOKORO_GFILE_DIR}/appengine/integration_tests/testsuite/driver.py
${KOKORO_GFILE_DIR}/appengine/integration_tests/testsuite/driver.py -d ${KOKORO_GITHUB_DIR}/${SAMPLE_APP_DIRECTORY} ${flags}
