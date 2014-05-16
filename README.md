runtime-nodejs-docker-image
===========================

Source for `google/runtime-nodejs` docker image.

## Description

[Docker](https://docker.io) base image for running nodejs applications.

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

## Notes

The image assumes that your application:
- contains a `package.json` file listing dependencies and defining a `main` script for your application.
- listens on port `8080`

### Example
```
{
    "name": "app",
    "version": "0.0.0",
    "description": "a nodejs app",
    "dependencies": {
        "googleapis": "0.7.0"
    },
    "main": "server.js"
}
```

When building your application docker image, dependencies listed in `package.json` are fetched and properly cached.
