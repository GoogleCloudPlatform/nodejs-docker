FROM google/debian:wheezy

EXPOSE 8080

RUN apt-get update && apt-get install --no-install-recommends -y -q curl python build-essential git
RUN mkdir /nodejs && curl http://nodejs.org/dist/v0.10.28/node-v0.10.28-linux-x64.tar.gz | tar xvzf - -C /nodejs --strip-components=1

ENV PATH $PATH:/nodejs/bin

WORKDIR /app
ONBUILD ADD package.json /app/
ONBUILD RUN npm install
ONBUILD ADD . /app

CMD []
ENTRYPOINT ["/nodejs/bin/npm", "start"]
