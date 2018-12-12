FROM test/nodejs
RUN install_node v9
COPY . /app/
RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)