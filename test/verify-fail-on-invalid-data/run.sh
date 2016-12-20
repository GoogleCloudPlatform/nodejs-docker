#!/bin/bash
(/opt/nodejs/verify_node /app/node-v6.9.2-linux-x64.tar.gz /app/SHASUMS256.txt.asc &> /dev/null) || echo "Correctly failed verification"