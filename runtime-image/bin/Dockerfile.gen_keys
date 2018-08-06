FROM gcr.io/gcp-runtimes/ubuntu_16_0_4

RUN apt-get update && apt-get install -qy gnupg2

WORKDIR /workspace
CMD ./bin/gen_keys.sh && \
    (cat ./contents/KEYS | gpg --dearmor > /tmp/keys) && \
    gpg --keyring /tmp/keys --list-keys --keyid-format long
