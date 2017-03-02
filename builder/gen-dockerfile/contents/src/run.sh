#!/bin/bash

BASE_DIR=`dirname $0`

#node /opt/nodejs-runtime-builder/dist/src/main.js ${1}
node ${BASE_DIR}/main.js ${1}
