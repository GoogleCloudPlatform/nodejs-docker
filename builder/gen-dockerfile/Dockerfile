FROM gcr.io/google_appengine/nodejs

ARG CANDIDATE_NAME
ENV CANDIDATE_NAME ${CANDIDATE_NAME}

ARG DOCKER_NAMESPACE
ENV DOCKER_NAMESPACE ${DOCKER_NAMESPACE}

# Install necessary dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q rsync
RUN npm install -g gulp-cli

# Add the runtime builder code
ADD contents/ /opt/nodejs-runtime-builder

# Setup the runtime builder code
RUN cd /opt/nodejs-runtime-builder && npm install && npm run transpile

ENTRYPOINT node /opt/nodejs-runtime-builder/dist/src/main.js ${DOCKER_NAMESPACE} ${CANDIDATE_NAME} /workspace
