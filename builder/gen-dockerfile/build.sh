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

# Fail fast
set -e

RUNTIME_NAME="nodejs-gen-dockerfile"

BASE_NAMESPACE=${1}
BASE_TAG=${2}

BUILDER_NAMESPACE=${3}
BUILDER_TAG=${4}

if [ -z "${BASE_NAMESPACE}" -o -z "${BASE_TAG}" -o -z "${BUILDER_NAMESPACE}" -o -z "${BUILDER_TAG}" ]; then
  echo "Usage: ${0} <base image namespace> <base image tag> <builder image namespace> <builder image tag>"
  exit 1
fi

# These are exported so that they can be used in cloudbuild.yaml.in
export BASE_TAG=${BASE_TAG}
export BASE_NAMESPACE=${BASE_NAMESPACE}
export IMAGE="${BUILDER_NAMESPACE}/${RUNTIME_NAME}:${BUILDER_TAG}"

# Generate the yaml file used to create the image
envsubst < cloudbuild.yaml.in > cloudbuild.yaml

# Build the image
gcloud container builds submit --config=cloudbuild.yaml .
