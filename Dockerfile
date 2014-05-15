FROM google/debian:wheezy

EXPOSE 8080

RUN apt-get install --no-install-recommends -y -q wget
RUN mkdir /nodejs
RUN wget -q http://nodejs.org/dist/v0.10.26/node-v0.10.26-linux-x64.tar.gz && tar xvzf node-v0.10.26-linux-x64.tar.gz -C /nodejs --strip-components=1 && rm node-v0.10.26-linux-x64.tar.gz

ENV PATH $PATH:/nodejs/bin

WORKDIR /app
ONBUILD ADD package.json /app/
ONBUILD RUN npm install
ONBUILD ADD . /app

ENTRYPOINT ["/nodejs/bin/npm", "start"]
