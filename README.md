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
docker build -t myorg/myapp .
```

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
