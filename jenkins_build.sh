RUNTIME_NAME="nodejs"

CANDIDATE_NAME=`date +%Y-%m-%d_%H_%M`
echo "CANDIDATE_NAME:${CANDIDATE_NAME}"
IMAGE_NAME="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

envsubst < cloudbuild.yaml.in > cloudbuild.yaml

gcloud beta container builds submit --config cloudbuild.yaml base/

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  gcloud beta container images add-tag ${IMAGE_NAME} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
fi

if [ ! -z "${NODE_VERSION_TAG}" ]; then
  gcloud beta container images add-tag ${IMAGE_NAME} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${NODE_VERSION_TAG} -q
fi