FROM test/nodejs
COPY . /app/
RUN yarn install --production || \
  ((if [ -f yarn-error.log ]; then \
      cat yarn-error.log; \
    fi) && false)
CMD yarn start