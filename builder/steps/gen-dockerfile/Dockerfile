FROM gcr.io/google-appengine/nodejs

# Install necessary dependencies
RUN apt-get update -y && apt-get install --no-install-recommends -y -q rsync
RUN npm install -g gulp-cli

# Add the runtime builder code
ADD contents/ /opt/nodejs-runtime-builder

ENV NODE_ENV=development

# Setup the runtime builder code
RUN cd /opt/nodejs-runtime-builder && npm install && gulp

ENTRYPOINT ["node", "/opt/nodejs-runtime-builder/dist/src/main.js", "--app-dir", "/workspace"]
