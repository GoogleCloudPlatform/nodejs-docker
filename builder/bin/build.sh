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

BUILDER_NAMESPACE=${1}
BUILDER_TAG=${2}
UPLOAD_TO_STAGING=${3}

if [ -z "${BUILDER_NAMESPACE}" -o -z "${BUILDER_TAG}" -o -z "${UPLOAD_TO_STAGING}" ]; then
  echo "Usage: ${0} <base image namespace> <base image tag> <builder image namespace> <builder image tag> <upload to staging (true|false)>"
  exit 1
fi

if [ "${BUILDER_TAG}" = "new" ]; then
  if [ -n "${TAG}" ]; then
    BUILDER_TAG=${TAG}
  else
    BUILDER_TAG=$(date +%Y-%m-%d_%H_%M)
  fi
fi

# Enter the steps directory so that all paths can be relative to that directory
pushd $(dirname $0)/../steps > /dev/null

pushd gen-dockerfile > /dev/null
./build.sh "${BUILDER_NAMESPACE}" "${BUILDER_TAG}" "${UPLOAD_TO_STAGING}"
popd > /dev/null

# Return to the original directory
popd > /dev/null
