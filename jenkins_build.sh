#!/bin/bash

SKIP_BASE_FLAG=--skip-base-image

usage() {
  echo "Usage: ${0} [${SKIP_BASE_FLAG}]"
  exit 1
}

# Ensure there are only 0 or 1 arguments
if (( $# > 1 )); then
  usage
fi

# If there are no arguments, then we default to building
# the base image.
BUILD_BASE_IMAGE=true
if (( $# == 1 )); then
  if [ "${1}" == "${SKIP_BASE_FLAG}" ]; then
    BUILD_BASE_IMAGE=false
  else
    usage
  fi
fi

if [ -z "${DOCKER_NAMESPACE}" ]; then
  echo "The DOCKER_NAMESPACE environment variable must be set when "
  echo "running this script."
  exit 1
fi

echo "gcloud --version"
gcloud --version

echo "gcloud docker --version"
gcloud docker -- version

echo "DOCKER_NAMESPACE:${DOCKER_NAMESPACE}"

if [ -z "${TAG}" ]; then
  TAG=`date +%Y-%m-%d_%H_%M`
fi

if [ "${BUILD_BASE_IMAGE}" == "true" ]; then
  cd base
  echo "Building the base image"
  ./build.sh "${DOCKER_NAMESPACE}" "${TAG}"
  cd ..
else
  echo "Skipping building the base image"
fi

cd builder
echo "Building the Flex Runtime Builder"
./build.sh "${DOCKER_NAMESPACE}" "latest" "${DOCKER_NAMESPACE}" "${TAG}"
cd ..
