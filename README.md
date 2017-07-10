# Google Cloud Platform Node.js Docker Image

[![Build Status](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker.svg?branch=master)](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker)

This repository contains the source for the Google-maintained Node.js [docker](https://docker.com) image.
This image can be found at `launcher.gcr.io/google/nodejs` or `gcr.io/google-appengine/nodejs`, and this image can be used as the base image
for running applications on [Google App Engine Flexible](https://cloud.google.com/appengine),
[Google Container Engine](https://cloud.google.com/container-engine), or any other Docker host.

This image is based on Debian Jessie and includes [nodejs](https://nodejs.org) and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/).

In addition, this repository contains the source for the Node.js Runtime Builder that can be used when deploying Node.js applications on App Engine Flexible.  The Node.js Runtime Builder currently is only used to deploy your application if the `gcloud beta app deploy` command is used.

For a more thorough walk-through of getting started with Node.js on Google Cloud Platform, please see the [documentation and guides](https://cloud.google.com/nodejs).

## The Node.js Runtime Image

### App Engine

To generate a Dockerfile that uses this image as a base, use the [`Cloud SDK`](https://cloud.google.com/sdk/gcloud/reference/beta/app/gen-config). From your existing Node.js application's root directory:
```shell
gcloud beta app gen-config --custom
```
You can then modify the `Dockerfile` and `.dockerignore` as needed for your application.

### Container Engine and Other Docker Hosts

For other docker hosts, you'll need to create a `Dockerfile` based on this image that copies your application code and installs dependencies. For example:

```docker
FROM launcher.gcr.io/google/nodejs

# Copy application code.
COPY . /app/

# Install dependencies.
RUN npm --unsafe-perm install
```

By default, the `CMD` is set to `npm start`. You can change this by specifying your own [`CMD` or `ENTRYPOINT`](http://docs.docker.com/engine/reference/builder/#cmd).

For a full example on deploying an application to Google Container Engine, see [this tutorial](https://cloud.google.com/nodejs/tutorials/bookshelf-on-container-engine).

#### Kubernetes Configuration

This image assumes your application listens on port 8080.
To run an application based on this image inside a Kubernetes pod, you can use a Pod configuration like this:

```yaml
kind: Pod
metadata:
  name: app
  namespace: default
spec:
  containers:
  - image: $IMAGE_NAME
    imagePullPolicy: IfNotPresent
    name: app
    ports:
    - containerPort: 8080
  restartPolicy: Always
  ```

### Installing a Different Node.js Version

The image includes the `install_node` script that can be used to install a particular Node.js version. For example:

```docker
FROM launcher.gcr.io/google/nodejs

# Install node.js 4.6.1
RUN install_node v4.6.1

# Copy application code.
COPY . /app/

# Install dependencies.
RUN npm --unsafe-perm install
```

Node.js is installed with binary packages hosted on a Google-provided mirror.

## The Node.js Runtime Builder

The Node.js Runtime Builder is used to deploy applications to App Engine Flexible when the `gcloud beta app deploy` command is used.  To deploy your application, issue `gcloud beta app deploy` from your application's root directory containing its `package.json` file.

During the deployment process, the Runtime Builder analyzes the files in your application's root directory to determine how to deploy your application.  The specifics with respect to what is used in the deployment is outlined in the following sections.  Additional information can be found in the Google Cloud Platform Node.js Runtime [documentation](https://cloud.google.com/appengine/docs/flexible/nodejs/runtime).

### Node.js Version

If your application's `package.json` file contains an `engines` field that contains a `node` field, that field will be used as a semver specification for the Node.js version to use in the deployment.  The Node.js version that matches that semver string will be used to run your deployed application.  If no Node.js version matches the semver string specified, the deployment will be aborted.

The following illustrates a section of a `package.json` file that specifies that the latest version of Node.js 6 should be used:
```javascript
{
  ...
  "engines": {
    "node": "6.x.x"
  }
  ...
}
```

### Package Manager

If your application's root directory contains a `yarn.lock` file, and `yarn.lock` is not specified in the `skip_files` section of your application's `app.yaml` file, then `yarn` will be used to install your application's dependencies and start the application.  Otherwise `npm` will be used to install dependencies and start your application.

The following is an example of an `app.yaml` file that will force the use of `npm` to install dependencies and start your deployed application even if a `yarn.lock` file exists in your application's root directory.

```yaml
runtime: nodejs
env: flex
skip_files:
  - ^yarn.lock$
```

Your application will be started by running `npm start` or `yarn start` depending on the package manager used.

## Contributing Changes

* See [CONTRIBUTING.md](CONTRIBUTING.md)

## Licensing

* See [LICENSE.md](LICENSE)
