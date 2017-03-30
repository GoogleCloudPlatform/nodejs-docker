FROM gcr.io/google_appengine/nodejs

ARG BASE_TAG
ENV BASE_TAG ${BASE_TAG}

ARG BASE_NAMESPACE
ENV BASE_NAMESPACE ${BASE_NAMESPACE}

# Install necessary dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q rsync
RUN npm install -g gulp-cli

# Add the runtime builder code
ADD contents/ /opt/nodejs-runtime-builder

# Setup the runtime builder code
RUN cd /opt/nodejs-runtime-builder && npm install && npm run transpile

ENTRYPOINT node /opt/nodejs-runtime-builder/dist/src/main.js /workspace ${BASE_NAMESPACE} ${BASE_TAG}
