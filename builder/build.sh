#!/bin/bash

# Copyright 2017 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# fail-fast
set -e

BUILDS_DIR="../builds"

DOCKER_NAMESPACE=${1}
CANDIDATE_NAME=${2}

if [ -z "${DOCKER_NAMESPACE}" -o -z "${CANDIDATE_NAME}" ]; then
  echo "Usage: ${0} <docker namespace> <candidate name>"
  echo "Please provide release a docker namespace and candidate name."
  exit 1
fi

cd gen-dockerfile
./build.sh "${DOCKER_NAMESPACE}" "${CANDIDATE_NAME}"
cd ..

mkdir -p ${BUILDS_DIR}
sed -e "s|\$DOCKER_NAMESPACE|${DOCKER_NAMESPACE}|g; s|\$CANDIDATE_NAME|${CANDIDATE_NAME}|g" \
  < nodejs.yaml.in > ${BUILDS_DIR}/nodejs-${2}.yaml

echo ${2} > ${BUILDS_DIR}/nodejs.version
