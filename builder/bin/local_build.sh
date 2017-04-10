#!/bin/bash

# fail-fast
set -e

BASE=$(dirname ${0})/..
LOCAL_BUILDS=${BASE}/local_builds

PROJECT=$(gcloud config get-value project)
BUILDER_NAMESPACE="gcr.io/${PROJECT}"
BUILDER_TAG=$(date +%Y-%m-%d_%H_%M)
UPLOAD_TO_STAGING="false"

# Build the pipeline steps and upload them to Google Container Registry
${BASE}/bin/build.sh ${BUILDER_NAMESPACE} ${BUILDER_TAG} ${UPLOAD_TO_STAGING}

# Tag the built image as 'latest'
TAG_OF_LATEST=$(gcloud beta container images list-tags ${BUILDER_NAMESPACE}/nodejs-gen-dockerfile --sort-by=~timestamp --limit=1 --format='get(tags)')
gcloud --quiet beta container images add-tag ${BUILDER_NAMESPACE}/nodejs-gen-dockerfile:${TAG_OF_LATEST} ${BUILDER_NAMESPACE}/nodejs-gen-dockerfile:latest

rm -Rf ${LOCAL_BUILDS}
mkdir ${LOCAL_BUILDS}

# Store a version of nodejs.yaml that is updated to use the current gcloud's project's GCR
sed "s|gcr.io/gcp-runtimes/nodejs-gen-dockerfile:latest|${BUILDER_NAMESPACE}/nodejs-gen-dockerfile:latest|g" ${BASE}/nodejs.yaml > ${LOCAL_BUILDS}/nodejs-${BUILDER_TAG}.yaml
echo ${BUILDER_TAG} > ${LOCAL_BUILDS}/nodejs.version
