FROM gcr.io/google-appengine/nodejs

# Install necessary dependencies
RUN npm install -g gulp-cli

# Add the runtime builder code
ADD contents/ /opt/nodejs-runtime-builder

ENV NODE_ENV=development

# Setup the runtime builder code
RUN cd /opt/nodejs-runtime-builder && npm install

ENTRYPOINT ["node", "/opt/nodejs-runtime-builder/dist/src/main.js", "--app-dir", "/workspace"]
