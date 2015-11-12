# Use the base App Engine Docker image, based on debian jessie.
FROM gcr.io/google_appengine/base

# Install updates and dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q curl python build-essential git ca-certificates libkrb5-dev && \
    apt-get clean && rm /var/lib/apt/lists/*_*

# Install the latest LTS release of nodejs
RUN mkdir /nodejs && curl https://nodejs.org/dist/v4.2.2/node-v4.2.2-linux-x64.tar.gz | tar xvzf - -C /nodejs --strip-components=1

# Set common env vars
ENV PATH $PATH:/nodejs/bin
ENV NODE_ENV production
WORKDIR /app

# start
CMD ["npm", "start"]
