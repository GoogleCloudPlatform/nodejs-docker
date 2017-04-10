#!/bin/bash

BASE=$(cd $(dirname $0) && pwd -P)

gcloud config set app/use_runtime_builders true
gcloud config set app/runtime_builders_root file://${BASE}/../local_builds
