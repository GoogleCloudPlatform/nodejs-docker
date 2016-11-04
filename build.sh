#!/bin/bash

usage() { echo "Usage: ./build.sh [target_image_path]"; exit 1; }

set -e

export IMAGE=$1

if [ -z "$IMAGE" ]; then
  usage
fi

envsubst < cloudbuild.yaml.in > cloudbuild.yaml
gcloud beta container builds submit --config=cloudbuild.yaml base/
