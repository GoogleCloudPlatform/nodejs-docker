FROM test/nodejs
COPY . /app/
RUN install_node v0.10.7
RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)
CMD npm start