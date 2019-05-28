# Use the base App Engine Docker image, based on Ubuntu 16.0.4.
FROM gcr.io/gcp-runtimes/ubuntu_16_0_4:latest

# Install updates and dependencies
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y -q \
      apt-transport-https \
      build-essential \
      ca-certificates \
      curl \
      git \
      imagemagick \
      libkrb5-dev \
      netbase \
      python && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm /var/lib/apt/lists/*_*

# Add the files necessary for verifying and installing node.
ADD contents/ /opt/gcp/runtime/
RUN ln -s /opt/gcp/runtime/install_node /usr/local/bin/install_node

# Install the latest LTS release of nodejs directly from nodejs.org
# with the installation aborting if verification of the nodejs binaries fails.
RUN /opt/gcp/runtime/bootstrap_node \
    --direct \
    v10.16.0
ENV PATH $PATH:/nodejs/bin

# Install yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main"  >> /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y -q yarn && \
    mkdir -p /opt/yarn/bin && \
    ln -s /usr/bin/yarn /opt/yarn/bin/yarn

# The use of --unsafe-perm is used here so that the installation is done
# as the current (root) user.  Otherwise, a failure in running 'npm install'
# (for example through a failure in a pre-or-post install hook) won't cause
# npm install to have a non-zero exit code.

# Install semver as required by the node version install script.
RUN npm install --unsafe-perm semver

# Set common env vars
ENV NODE_ENV production
ENV PORT 8080

WORKDIR /app

# start
CMD ["npm", "start"]
