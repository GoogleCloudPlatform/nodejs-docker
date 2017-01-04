FROM test/nodejs

COPY . /app/

WORKDIR /app

RUN curl --fail -O https://nodejs.org/dist/v0.10.7/node-v0.10.7-linux-x64.tar.gz
RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)

CMD npm start