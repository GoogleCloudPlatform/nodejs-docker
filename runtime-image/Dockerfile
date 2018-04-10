# Use the base App Engine Docker image, based on debian jessie.
FROM gcr.io/google-appengine/debian8

# Install updates and dependencies
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y -q \
      build-essential \
      ca-certificates \
      curl \
      git \
      imagemagick \
      libkrb5-dev \
      netbase \
      python && \
    apt-get clean && \
    rm /var/lib/apt/lists/*_*

# Add the files necessary for verifying and installing node.
ADD contents/ /opt/gcp/runtime/
RUN ln -s /opt/gcp/runtime/install_node /usr/local/bin/install_node

# Install the latest LTS release of nodejs directly from nodejs.org
# with the installation aborting if verification of the nodejs binaries fails.
RUN /opt/gcp/runtime/bootstrap_node \
    --direct \
    v8.11.1
ENV PATH $PATH:/nodejs/bin

# Install yarn
RUN mkdir -p /opt/yarn && curl -L https://yarnpkg.com/latest.tar.gz | tar xvzf - -C /opt/yarn --strip-components=1
ENV PATH $PATH:/opt/yarn/bin

# The use of --unsafe-perm is used here so that the installation is done
# as the current (root) user.  Otherwise, a failure in running 'npm install'
# (for example through a failure in a pre-or-post install hook) won't cause
# npm install to have a non-zero exit code.

# Install semver as required by the node version install script.
RUN npm install --unsafe-perm semver

# Set common env vars
ENV NODE_ENV production

WORKDIR /app

# start
CMD ["npm", "start"]
