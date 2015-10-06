FROM google/nodejs
ONBUILD RUN echo "This image is now deprecated. If you are using the nodejs runtime for Google Managed VMs, please set \"runtime: nodejs\" in your app.yaml.  If you are not using Managed VMs, you should use the official Node Docker image located at: https://hub.docker.com/_/node/.  To learn more, visit http://cloud.google.com/nodejs/."
ONBUILD RUN exit 1;