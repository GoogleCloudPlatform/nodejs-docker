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

export PROJECT=$1
export TAG=$2

if [ -z "${TAG}" -o -z "${PROJECT}" ]; then
  echo "Usage: ${0} <project> <tag>"
  echo "Please provide release a project name and tag."
  exit 1
fi

cd gen-dockerfile
./build.sh "${PROJECT}" "$TAG"
cd ..

sed -e "s|\$PROJECT|${PROJECT}|g; s|\$TAG|${TAG}|g" \
  < nodejs.yaml.in > nodejs.yaml
