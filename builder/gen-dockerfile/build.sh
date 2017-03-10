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
DOCKER_NAMESPACE=${1}

# These are referenced within cloudbuild.yaml.in
export CANDIDATE_NAME=${2}
export IMAGE="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

if [ -z "${DOCKER_NAMESPACE}" -o -z "${CANDIDATE_NAME}" ]; then
  echo "Usage: ${0} <docker namespace> <candidate name>"
  echo "Please provide release a docker namespace and candidate name."
  exit 1
fi

# Generate the yaml file used to create the image
envsubst < cloudbuild.yaml.in > cloudbuild.yaml

# Build the image
gcloud container builds submit --config=cloudbuild.yaml .

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
fi
