FROM google/nodejs

WORKDIR /app
ONBUILD ADD package.json /app/
ONBUILD RUN npm install
ONBUILD ADD . /app

EXPOSE 8080
CMD []
ENTRYPOINT ["/nodejs/bin/npm", "start"]
