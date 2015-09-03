#!/bin/bash
# Link the specified version of node & npm from their installation directories
# to /bin.

set -e

# Make sure we got a version argument.
if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Get the nvm environmental definitions.
. /root/.bashrc

abs_path=$(nvm which "$1")

if [ -n "$abs_path" ]; then
  ln -s "$abs_path" /bin/node
  ln -s "$(dirname $abs_path)/npm" /bin/npm
else
  exit 1
fi
