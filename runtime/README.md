# google/nodejs-runtime

[`google/nodejs-runtime`](https://index.docker.io/u/google/nodejs-runtime) is a [docker](https://docker.io) base image for easily running [nodejs](https://nodejs.org) application.

It is based on [`google/nodejs`](https://index.docker.io/u/google/nodejs) base image.

## Usage

- Create a Dockerfile in your nodejs application directory with the following content:

        FROM google/nodejs-runtime

- Run the following command in your application directory:

        docker build -t my/app .

## Notes

The image assumes that your application:

- has a file named [`package.json`](https://www.npmjs.org/doc/json.html) listing its dependencies.
- has a file named `server.js` as the entrypoint script or define in `package.json` the attribute: `"scripts": {"start": "node <entrypoint_script_js>"}`
- listens on port `8080`

### Example

`package.json`

    {
      "name": "hello-world",
      "description": "hello world test app",
      "version": "0.0.1",
      "private": true,
      "dependencies": {
        "express": "3.x"
      },
      "scripts": {"start": "node app.js"}
    }

When building your application docker image, dependencies listed in `package.json` are fetched and properly cached.
