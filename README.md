# Google Cloud Platform Node.js Docker Image

[![Build Status](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker.svg?branch=master)](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker)

This repository contains the source for the Google-maintained Node.js [docker](https://docker.com) image.
This image can be found at `launcher.gcr.io/google/nodejs` or `gcr.io/google-appengine/nodejs` and can be used as the base image
for running applications on [Google App Engine Flexible](https://cloud.google.com/appengine),
[Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine), or any other Docker host.

This image is based on Ubuntu 16.0.4 and includes [nodejs](https://nodejs.org) and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/) and [yarn](https://yarnpkg.com) installed from [yarnpkg.com](https://yarnpkg.com).

For a more thorough walk through of getting started with Node.js on Google Cloud Platform, please see the [documentation and guides](https://cloud.google.com/nodejs).

## App Engine

To generate a Dockerfile that uses this image as a base, use the [`Cloud SDK`](https://cloud.google.com/sdk/gcloud/reference/beta/app/gen-config). From your existing Node.js application:
```bash
gcloud beta app gen-config --custom
```
You can then modify the `Dockerfile` and `.dockerignore` as needed for you application.

## Kubernetes Engine and Other Docker Hosts

For other docker hosts, you'll need to create a `Dockerfile` based on this image that copies your application code and installs dependencies. For example:

```docker
FROM launcher.gcr.io/google/nodejs

# Copy application code.
COPY . /app/

# Install dependencies.
RUN npm --unsafe-perm install
```

By default, the `CMD` is set to `npm start`. You can change this by specifying your own [`CMD` or `ENTRYPOINT`](http://docs.docker.com/engine/reference/builder/#cmd).

For a full example on deploying an application to Google Kubernetes Engine, see [this tutorial](https://cloud.google.com/nodejs/tutorials/bookshelf-on-container-engine).

### Kubernetes Configuration

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

## Installing a Different Node.js Version

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

Node.js is installed with binary packages hosted on a Google-provided mirror.  Before installing the specified version of Node.js, checks are performed to verify that the associated binary is an official Node.js release.  The `install_node` script will refuse to install a binary that fails this verification.

To override this behavior, and force the installation of the binary, pass the `--ignore-verification-failure` flag to `install_node`.  However, it is highly recommended that you only install Node.js binaries that have been successfully verified.

# Contributing changes

* See [CONTRIBUTING.md](CONTRIBUTING.md)

## Licensing

* See [LICENSE.md](LICENSE)
