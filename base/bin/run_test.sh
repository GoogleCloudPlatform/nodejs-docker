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

# Change the current working directory to the `base` directory instead of
# the `base/bin` directory
pushd $(dirname $0)/.. > /dev/null

npm run build
npm run prepare-test

npm install

npm test

EXT_RUN_SH=./bin/ext_run.sh
curl https://raw.githubusercontent.com/GoogleCloudPlatform/runtimes-common/master/structure_tests/ext_run.sh > ${EXT_RUN_SH}
chmod +x ${EXT_RUN_SH}
${EXT_RUN_SH} -i test/nodejs -v --config test/test_config.yaml
