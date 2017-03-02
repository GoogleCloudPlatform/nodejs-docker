FROM gcr.io/google_appengine/nodejs

# Install necessary dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q rsync
RUN npm install -g gulp-cli

# Add the runtime builder code
ADD contents/ /opt/nodejs-runtime-builder

# Setup the runtime builder code
RUN cd /opt/nodejs-runtime-builder && npm install
RUN cd /opt/nodejs-runtime-builder && ./transpile.sh

ENTRYPOINT ["/opt/nodejs-runtime-builder/dist/src/run.sh", "/workspace"]
