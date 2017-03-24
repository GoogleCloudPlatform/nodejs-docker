#!/bin/bash

usage() {
  echo "Usage: ${0} [Base Image Tag]"
  echo ""
  echo "Builds a Node.js builder pipeline and possibly the Node.js base image."
  echo "If a base image tag is specified, the base image will not be built,"
  echo "and the builder pipeline will be built to use the specified base image."
  echo "Otherwise, the base image is built along with the builder pipeline"
  echo "and the builder pipeline is is setup to use the newly built base image."
  exit 1
}

# Ensure there are only 0 or 1 arguments
if (( $# > 1 )); then
  usage
fi

BASE_IMAGE_TAG=${1}

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

if [ -z "${BASE_IMAGE_TAG}" ]; then
  cd base
  echo "Building the base image"
  ./build.sh "${DOCKER_NAMESPACE}" "${TAG}"
  BASE_IMAGE_TAG=${TAG}
  cd ..
else
  echo "Using the base image with tag ${BASE_IMAGE_TAG}"
fi

cd builder
echo "Building the Flex Runtime Builder"
./build.sh "gcr.io/google_appengine" "${BASE_IMAGE_TAG}" "gcr.io/gcp-runtimes" "${TAG}"
cd ..
