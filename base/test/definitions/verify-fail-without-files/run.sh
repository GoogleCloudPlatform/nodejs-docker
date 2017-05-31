#!/bin/bash
(/opt/gcp/runtime/verify_node /app/node-v0.10.7-linux-x64.tar.gz /app/SHASUMS256.txt.asc &> /dev/null) || echo "Correctly failed verification"