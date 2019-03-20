#!/bin/bash

set -ex

source $KOKORO_PIPER_DIR/google3/third_party/runtimes_common/kokoro/common.sh

cd ${KOKORO_PIPER_DIR}/${SAMPLE_APP_DIRECTORY}
if [ -n "${RUNTIME_SPEC}" -a -f app.yaml.in ]; then
  sed "s|\${RUNTIME_SPEC}|${RUNTIME_SPEC}|" app.yaml.in > app.yaml
fi

cd $KOKORO_PIPER_DIR/google3/third_party/runtimes_common/appengine/integration_tests

sudo /usr/local/bin/pip install --upgrade -r requirements.txt

export DEPLOY_LATENCY_PROJECT='cloud-deploy-latency'

skip_flag=""

if [ "${SKIP_CUSTOM_LOGGING_TESTS}" = "true" -o "${SKIP_BUILDERS}" = "true" ]; then
  skip_flag="$skip_flag --skip-builders"
fi

if [ "${SKIP_XRT}" = "true" ]; then
  skip_flag="$skip_flag --skip-xrt"
fi

python deploy_check.py -d ${KOKORO_PIPER_DIR}/${SAMPLE_APP_DIRECTORY} -l ${LANGUAGE} ${skip_flag}
