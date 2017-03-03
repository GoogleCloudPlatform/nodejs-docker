#!/bin/bash

rm -Rf dist
rsync -avq src dist --exclude node_modules --exclude '**/*.ts'
gulp
