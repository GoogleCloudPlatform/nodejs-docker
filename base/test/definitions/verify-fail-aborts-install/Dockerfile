FROM test/definitions/base-install-node
RUN install_node v6.10.3
# The ! inverts the exit code from 0 to non-zero or non-zero to 0.
#
# The call to install_node in the next step is expected to fail and thus have
# a non-zero exit code.  As a result, the ! causes the entire line to have a
# zero exit code if the installation fails as expected.
#
# However, if the installation does not fail, the exit code of the entire line
# will be non-zero and the construction of the Docker image from this file will
# fail.
RUN ! install_node v0.10.7
CMD npm start