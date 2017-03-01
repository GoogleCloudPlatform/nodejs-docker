#!/bin/bash

rm -Rf dist
rsync -av --progress src dist --exclude node_modules --exclude '**/*.ts'
gulp
