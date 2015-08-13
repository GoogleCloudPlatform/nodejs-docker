# google/nodejs

[`gcr.io/google_appengine/nodejs`](https://cloud.google.com/nodejs) is a [docker](https://docker.io) base image that bundles selected versions of [nodejs](https://nodejs.org) and [npm](https://npmjs.org) installed from [nodejs.org](http://nodejs.org/download/).

## Usage

- Create a Dockerfile in your nodejs application directory with the following content:

        FROM gcr.io/google_appengine/nodejs
        
        ADD . /app
        
- Run the following command in your application directory:

        docker build -t my/app .

