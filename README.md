runtime-nodejs-docker-image
===========================

Source for [`google/runtime-nodejs`](https://index.docker.io/u/google/runtime-nodejs/) docker image.

## Description

[Docker](https://docker.io) base image for easily running nodejs applications.

It is based on [`google/nodejs`](https://index.docker.io/u/google/runtime-nodejs/) base image.

## Usage

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
