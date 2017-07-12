FROM test/nodejs
RUN install_node v0.10.0
COPY . /app/
RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)