FROM test/nodejs

COPY . /app/

WORKDIR /app

# Get the SHASUMS256 file from one version of Node and get the binary
# from a different version of Node
RUN curl --fail -O https://nodejs.org/dist/v6.9.2/SHASUMS256.txt.asc
RUN curl --fail -o node-v6.9.2-linux-x64.tar.gz https://nodejs.org/dist/v5.0.0/node-v5.0.0-linux-x64.tar.gz

RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)

CMD npm start