# Use the base App Engine Docker image, based on debian jessie.
FROM gcr.io/google-appengine/debian8

# Install updates and dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q curl python build-essential git ca-certificates libkrb5-dev imagemagick netbase wget && \
    apt-get clean && rm /var/lib/apt/lists/*_*

# Add the files necessary for verifying and installing node
# These files are placed in /opt/nodejs so that they will remain
# even if the /nodejs directory is removed.  Further, the PATH is
# is not updated, because these scripts should only be called
# using an absolute path.
ADD KEYS verify_node verify_install_node /opt/nodejs/

# Install the latest LTS release of nodejs
RUN /opt/nodejs/verify_install_node https://nodejs.org/dist/v6.11.1 v6.11.1 SHASUMS256.txt.asc /nodejs FAIL_ON_ERROR
ENV PATH $PATH:/nodejs/bin

# The bootstrapping script should not be used after an initial version
# of node has been installed
RUN rm -f /opt/nodejs/bootstrap_node

# Install yarn
RUN mkdir -p /opt/yarn && curl -L https://yarnpkg.com/latest.tar.gz | tar xvzf - -C /opt/yarn --strip-components=1
ENV PATH $PATH:/opt/yarn/bin

# The use of --unsafe-perm is used here so that the installation is done
# as the current (root) user.  Otherwise, a failure in running 'npm install'
# (for example through a failure in a pre-or-post install hook) won't cause
# npm install to have a non-zero exit code.

# Install semver as required by the node version install script.
RUN npm install --unsafe-perm semver

# Add the node version install script
ADD contents/install_node /usr/local/bin/install_node

# Set common env vars
ENV NODE_ENV production

WORKDIR /app

# start
CMD ["npm", "start"]
