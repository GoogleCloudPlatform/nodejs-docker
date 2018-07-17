#!/bin/bash

# fail-fast
set -e

function fail() {
  echo -e "ERROR: ${1}"
  exit 1
}

function validateValueOption() {
  OPTION="${1%=*}"
  VALUE="${1#*=}"
  # If an option was specified as
  #   --option
  # instead of
  #   --option=value
  # or
  #   --option=
  # Then the OPTION and VALUE variables will be the same.
  # This indicates an error since otherwise the option's
  # flag will incorrectly be used as the value to use for
  # the option.
  if [ "${OPTION}" = "${VALUE}" ]; then
    MESSAGE="The ${OPTION} option must be of the form \"${OPTION}=value\""
    MESSAGE+="\n       (or \"${OPTION}=\" to indicate no value)"
    fail "${MESSAGE}"
  fi
}

function print() {
  if [ "${VERBOSE}" = "true" ]; then
    echo -e "${1}"
  fi
}

_NODE_VERSION_OPTION="--node-version"
_UPLOAD_TO_STAGING_OPTION="--upload-to-staging"
_CANDIDATE_NAME_OPTION="--candidate-name"
_DOCKER_NAMESPACE_OPTION="--docker-namespace"
_VERBOSE_OPTION="--verbose"
_HELP_OPTION="--help"

function usage() {
  echo "Usage: $(basename $0) [--help --verbose] [option=value ...]"
  echo ""
  echo "Build the Node.js runtime image"
  echo ""
  echo "Options:"
  echo "  ${_DOCKER_NAMESPACE_OPTION}   Specifies the namespace to use for the built image, "
  echo "                       (For example \"gcr.io/my-project\")."
  echo ""
  echo "                       If not specified, \"gcr.io/<current gcloud project>\" will be used."
  echo "  ${_CANDIDATE_NAME_OPTION}     Specifies a candiate name to use for the image.  This will be"
  echo "                       used to tag the image."
  echo ""
  echo "                       If not specified, the current timestamp will be used."
  echo "  ${_NODE_VERSION_OPTION}       Specify the Node.js version in the runtime image that will be"
  echo "                       used as a tag for the built image."
  echo ""
  echo "                       If not specified, the built image will not be tagged with a version."
  echo "  ${_UPLOAD_TO_STAGING_OPTION}  Specifies whether to mark the built image with the 'staging' tag."
  echo "                       Must be followed by either \"true\" or \"false\"."
  echo ""
  echo "                       If not specified, the image will not be given the 'staging' tag."
  echo "  ${_VERBOSE_OPTION}            Causes details to be printed as this command is run"
  echo "  ${_HELP_OPTION}               Displays this help"
  exit 1
}

DOCKER_NAMESPACE=
CANDIDATE_NAME=
NODE_VERSION_TAG=
UPLOAD_TO_STAGING=

VERBOSE="false"
RUNTIME_NAME="nodejs"

# Parse the command line arguments
while [ $# -gt 0 ]; do
  case "${1%=*}" in
    ${_NODE_VERSION_OPTION})
      validateValueOption "${1}"
      NODE_VERSION_TAG="${1#*=}"
      shift
      ;;
    ${_UPLOAD_TO_STAGING_OPTION})
      validateValueOption "${1}"
      UPLOAD_TO_STAGING="${1#*=}"
      shift
      ;;
    ${_DOCKER_NAMESPACE_OPTION})
      validateValueOption "${1}"
      DOCKER_NAMESPACE="${1#*=}"
      shift
      ;;
    ${_CANDIDATE_NAME_OPTION})
      validateValueOption "${1}"
      CANDIDATE_NAME="${1#*=}"
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
      echo "Unknown option ${1%=*}"
      echo ""
      shift
      usage
      ;;
  esac
done

if [ -z "${DOCKER_NAMESPACE}" ]; then
  DOCKER_NAMESPACE="gcr.io/$(gcloud config get-value project 2> /dev/null)"
  print "A namespace was not specified with ${_DOCKER_NAMESPACE_OPTION}."
  print "The value ${DOCKER_NAMESPACE} will be used.\n"
fi

if [ -z "${CANDIDATE_NAME}" ]; then
  CANDIDATE_NAME=$(date +%Y-%m-%d_%H_%M)
  print "A candidate name was not specified with ${_CANDIDATE_NAME_OPTION}."
  print "The value ${CANDIDATE_NAME} will be used.\n"
fi

if [ -z "${NODE_VERSION_TAG}" ]; then
  print "The Node.js version was not specified with the ${_NODE_VERSION_OPTION}."
  print "The image will not be tagged with a Node.js version.\n"
fi

if [ -z "${UPLOAD_TO_STAGING}" ]; then
  UPLOAD_TO_STAGING="false"
  print "Whether to specify the staging tag was not specified with ${_UPLOAD_TO_STAGING_OPTION}."
  print "The image will not be tagged with the 'staging' tag.\n"
fi

export IMAGE="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

print "$(gcloud --version)\n"
print "$(gcloud docker -- version)\n"

print "Namespace:         \"${DOCKER_NAMESPACE}\""
print "Candidate name:    \"${CANDIDATE_NAME}\""
print "Node version:      \"${NODE_VERSION_TAG}\""
print "Upload to staging: \"${UPLOAD_TO_STAGING}\""
print "Image:             \"${IMAGE}\"\n"

# Run from the parent directory, not the bin directory, since the
# parent directory is the root of the contents being processed.
cd $(dirname $0)/..

envsubst < cloudbuild.yaml.in > cloudbuild.yaml

print "Building the image"
gcloud builds submit --config cloudbuild.yaml .
print "Done\n"

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  print "Setting the staging tag"
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
  print "Done\n"
fi

if [ ! -z "${NODE_VERSION_TAG}" ]; then
  print "Setting the version tag to \"${NODE_VERSION_TAG}\""
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${NODE_VERSION_TAG} -q
  print "Done\n"
fi
