#!/bin/bash

usage() { echo "Usage: ./build.sh [target_image_path]"; exit 1; }

set -e

export IMAGE=$1

if [ -z "$IMAGE" ]; then
  usage
fi

envsubst < base/cloudbuild.yaml.in > base/cloudbuild.yaml
gcloud beta container builds submit --config=base/cloudbuild.yaml .
