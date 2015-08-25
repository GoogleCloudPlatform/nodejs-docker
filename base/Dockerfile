# Base Dockerfile for App Engine Node runtime.
FROM gcr.io/google_appengine/base
RUN apt-get update -y && apt-get install --no-install-recommends -y -q curl python build-essential git ca-certificates libssl-dev && \
    apt-get clean && rm /var/lib/apt/lists/*_*
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.26.1/install.sh | \
    bash
ENV BASH_ENV /root/.bashrc
RUN bash -c "nvm install 0.10"
RUN bash -c "nvm install 0.11"
RUN bash -c "nvm install 0.12"

ENV NODE_ENV production
WORKDIR /app
CMD ["npm", "start"]
