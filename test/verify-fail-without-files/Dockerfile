FROM test/nodejs
CMD (/opt/nodejs/verify_install_node https://nodejs.org/dist/v0.10.7 v0.10.7 SHASUMS256.txt.asc /nodejs FAIL_ON_ERROR)  || echo "Correctly failed verification"