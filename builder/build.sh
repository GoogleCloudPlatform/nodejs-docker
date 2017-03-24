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

BASE_NAMESPACE=${1}
BASE_TAG=${2}

BUILDER_NAMESPACE=${3}
BUILDER_TAG=${4}

if [ -z "${BASE_NAMESPACE}" -o -z "${BASE_TAG}" -o -z "${BUILDER_NAMESPACE}" -o -z "${BUILDER_TAG}" ]; then
  echo "Usage: ${0} <base image namespace> <base image tag> <builder image namespace> <builder image tag>"
  exit 1
fi

cd gen-dockerfile
./build.sh "${BASE_NAMESPACE}" "${BASE_TAG}" "${BUILDER_NAMESPACE}" "${BUILDER_TAG}"
cd ..
