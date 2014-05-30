nodejs-docker
=============

This repository contains the sources for the following [docker][0] base images:
- [`google/runtime-nodejs`](#google-runtime-nodejs)
- [`google/nodejs`](#google-nodejs)

## google/runtime-nodejs

[`google/runtime-nodejs`][2] is a [docker][0] base image for easily running [nodejs][3] application.

It is based on [`google/nodejs`](#google-nodejs) base image.

### Usage

- Create a Dockerfile in your nodejs application directory with the following content:

        FROM google/runtime-nodejs

- Run the following command in your application directory:

        docker -t my/app .

## Notes

The image assumes that your application:

- has a file named [`package.json`](https://www.npmjs.org/doc/json.html) listing its dependencies.
- has a file named `server.js` as the entrypoint script or define in `package.json` the attribute: `"scripts": {"start": "node <entrypoint_script_js>"}`
- listens on port `8080`

### Example

`package.json`


    {
        "name": "app",
        "version": "0.0.0",
        "description": "a nodejs app",
        "dependencies": {
            "googleapis": "0.7.0"
        },
        "scripts": {"start": "node app.js"}
    }


When building your application docker image, dependencies listed in `package.json` are fetched and properly cached.

## google/nodejs

[`google/nodejs`][1] is a [docker][0] base image that bundles the latest version of [nodejs][3] and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/).

### Usage

- Create a Dockerfile in your nodejs application directory with the following content:

        FROM google/nodejs
        WORKDIR /app
        ADD package.json /app/
        RUN npm install
        ADD . /app
        
        CMD []
        ENTRYPOINT ["/nodejs/bin/npm", "start"]

- Run the following command in your application directory:

        docker build -t my/app .

[0]: https://docker.io
[1]: https://index.docker.io/u/google/nodejs
[2]: https://index.docker.io/u/google/runtime-nodejs
[3]: https://nodejs.org