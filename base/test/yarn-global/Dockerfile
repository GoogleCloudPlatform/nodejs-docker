FROM test/nodejs
COPY . /app/
RUN npm install --global yarn@0.18.0
RUN yarn install --production || \
  ((if [ -f yarn-error.log ]; then \
      cat yarn-error.log; \
    fi) && false)
CMD yarn start