runtime-nodejs-docker-image
===========================

Source for `google/runtime-nodejs` docker image.

## Description

A [Docker](https://docker.io) base image for running nodejs applications.

It bundles the latest version of [nodejs](https://nodejs.org) and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/).

## Usage

- Create a Dockerfile in your nodejs application directory with the following content:
```
FROM google/runtime-nodejs
```
- Run the following command in your application directory:
```
docker -t myorg/myapp .
```

** Note **
It assumes that your application:
- contains a `package.json` file listing your application dependencies.
- contains a `server.js` file for starting your application.
- listens on port `8080`
