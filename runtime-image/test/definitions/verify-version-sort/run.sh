#!/bin/sh
cat /opt/gcp/runtime/KEYS | gpg --dearmor > /tmp/keys
gpg --keyring /tmp/keys --list-keys --keyid-format long
