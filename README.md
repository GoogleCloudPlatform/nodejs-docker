# Google Cloud Platform Node.js Docker Image

[![Build Status](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker.svg?branch=master)](https://travis-ci.org/GoogleCloudPlatform/nodejs-docker)

This repository contains the source for the `gcr.io/google_appengine/nodejs` [docker](https://docker.com) image. This image can be used as the base image for running applications on [Google App Engine Managed VMs](https://cloud.google.com/appengine), [Google Container Engine](https://cloud.google.com/container-engine), or any other Docker host.

This image is based on Debian Jessie and includes [nodejs](https://nodejs.org) and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/).

## App Engine

To generate a Dockerfile that uses this image as a base, use the [`Cloud SDK`](https://cloud.google.com/sdk/gcloud/reference/preview/app/gen-config):

    gcloud preview app gen-config --custom 

You can then modify the `Dockerfile` and `.dockerignore` as needed for you application.

## Container Engine & other Docker hosts.

For other docker hosts, you'll need to create a `Dockerfile` based on this image that copies your application code and installs dependencies. For example:

        FROM gcr.io/google_appengine/nodejs

        # Copy application code.
        COPY . /app/

        # Install dependencies.
        RUN npm --unsafe-perm install

By default, the `CMD` is set to `npm start`. You can change this by specifying your own [`CMD` or `ENTRYPOINT`](http://docs.docker.com/engine/reference/builder/#cmd).

## Installing a different Node.js version

The image includes the `install_node` script that can be used to install a particular Node.js version. For example:

        FROM gcr.io/google_appengine/nodejs

        # Install node.js 0.12.7
        RUN install_node v0.12.7

        # Copy application code.
        COPY . /app/

        # Install dependencies.
        RUN npm --unsafe-perm install

Node.js is installed with binary packages hosted on a Google-provided mirror.


# Contributing changes

* See [CONTRIBUTING.md](CONTRIBUTING.md)

## Licensing

* See [LICENSE.md](LICENSE)

