
RUNTIME_NAME="nodejs"
DOCKER_NAMESPACE=${1}
CANDIDATE_NAME=${2}

if [ -z "${DOCKER_NAMESPACE}" -o -z "${CANDIDATE_NAME}" ]; then
  echo "Usage: ${0} <docker namespace> <candidate name>"
  echo "Please provide release a docker namespace and candidate name."
  exit 1
fi

export IMAGE="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

envsubst < cloudbuild.yaml.in > cloudbuild.yaml
gcloud beta container builds submit --config cloudbuild.yaml .

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
fi

if [ ! -z "${NODE_VERSION_TAG}" ]; then
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${NODE_VERSION_TAG} -q
fi
