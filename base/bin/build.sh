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

function fail() {
  echo "ERROR: ${1}"
  exit 1
}

function print() {
  if [ "${VERBOSE}" = "true" ]; then
    echo "${1}"
  fi
}

_NODE_VERSION_OPTION="--node-version"
_UPLOAD_TO_STAGING_OPTION="--upload-to-staging"
_CANDIDATE_NAME_OPTION="--candidate-name"
_DOCKER_NAMESPACE_OPTION="--docker-namespace"
_VERBOSE_OPTION="--verbose"
_HELP_OPTION="--help"

function usage() {
  echo "Usage: $(basename $0) [options...]"
  echo ""
  echo "Build the Node.js runtime image"
  echo ""
  echo "Options:"
  echo "  ${_DOCKER_NAMESPACE_OPTION}   Specifies the namespace to use for the build image."
  echo "                       For example \"gcr.io/my-project\".  If not specified,"
  echo "                       \"gcr.io/<project id>\" will be used."
  echo "  ${_CANDIDATE_NAME_OPTION}     Specifies a candiate name to use for the image.  This will be"
  echo "                       used to tag the image.  If unspecified, a timestamp will be used."
  echo "  ${_NODE_VERSION_OPTION}       Specify the Node.js version in the runtime image.  If specified,"
  echo "                       the image will be tagged with the specified version string."
  echo "  ${_UPLOAD_TO_STAGING_OPTION}  Specifies whether to mark the built image with the 'staging' tag."
  echo "                       Must be followed by either \"true\" or \"false\"."
  echo "  ${_VERBOSE_OPTION}            Causes details to be printed as this command is run"
  echo "  ${_HELP_OPTION}               Displays this help"
  exit 1
}

UPLOAD_TO_STAGING="false"
VERBOSE="false"
RUNTIME_NAME="nodejs"

# Parse the command line arguments
while [ $# -gt 0 ]; do
  case "$1" in
    ${_NODE_VERSION_OPTION})
      shift
      if [ -z "${1}" ]; then
        fail "${_NODE_VERSION_OPTION} must be followed by a version string"
      fi
      NODE_VERSION_TAG="${1}"
      shift
      ;;
    ${_UPLOAD_TO_STAGING_OPTION})
      shift
      if [ "${1}" != "true" ] && [ "${1}" != "false" ]; then
        fail "${_UPLOAD_TO_STAGING_OPTION} must be followed by either true or false"
      fi
      UPLOAD_TO_STAGING="${1}"
      shift
      ;;
    ${_DOCKER_NAMESPACE_OPTION})
      shift
      if [ -z "${1}" ]; then
        fail "${_DOCKER_NAMESPACE_OPTION} must be followind by a string"
      fi
      DOCKER_NAMESPACE="${1}"
      shift
      ;;
    ${_CANDIDATE_NAME_OPTION})
      shift
      if [ -z "${1}" ]; then
        fail "${_CANDIDATE_NAME_OPTION} must be followed by a string"
      fi
      CANDIDATE_NAME="${1}"
      shift
      ;;
    ${_VERBOSE_OPTION})
      shift
      VERBOSE="true"
      ;;
    ${_HELP_OPTION})
      shift
      usage
      ;;
    *)
      echo "Unknown option ${1}"
      echo ""
      shift
      usage
      ;;
  esac
done

if [ -z "${DOCKER_NAMESPACE}" ]; then
  DOCKER_NAMESPACE="gcr.io/$(gcloud config get-value project)"
  print "A namespace was not specified with ${_DOCKER_NAMESPACE_OPTION}"
  print "The value ${DOCKER_NAMESPACE} will be used"
fi

if [ -z "${CANDIDATE_NAME}" ]; then
  CANDIDATE_NAME=$(date +%Y-%m-%d_%H_%M)
  print "A candidate name was not specified with ${_CANDIDATE_NAME_OPTION}"
  print "The value ${CANDIDATE_NAME} will be used"
fi

export IMAGE="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

print "gcloud --version"
if [ "${VERBOSE}" = "true" ]; then
  gcloud --version
fi
print ""

print "gcloud docker -- version"
if [ "${VERBOSE}" = "true" ]; then
  gcloud docker -- version
fi
print ""

print "Namespace:         \"${DOCKER_NAMESPACE}\""
print "Candidate name:    \"${CANDIDATE_NAME}\""
print "Node version:      \"${NODE_VERSION_TAG}\""
print "Upload to staging: \"${UPLOAD_TO_STAGING}\""
print "Image:             \"${IMAGE}\""
print ""

# Change the current working directory to the `base` directory instead of
# the `base/bin` directory
pushd `dirname $0`/.. > /dev/null

envsubst < cloudbuild.yaml.in > cloudbuild.yaml

print "Building the image"
gcloud beta container builds submit --config cloudbuild.yaml .
print "Done"
print ""

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  print "Setting the staging tag"
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
  print "Done"
  print ""
fi

if [ ! -z "${NODE_VERSION_TAG}" ]; then
  print "Setting the version tag to \"${NODE_VERSION_TAG}\""
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${NODE_VERSION_TAG} -q
  print "Done"
  print ""
fi
