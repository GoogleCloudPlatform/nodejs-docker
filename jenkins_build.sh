echo "gcloud docker -- version"
gcloud docker -- version

RUNTIME_NAME="nodejs"

CANDIDATE_NAME=`date +%Y-%m-%d_%H_%M`
echo "CANDIDATE_NAME:${CANDIDATE_NAME}"
export IMAGE="${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${CANDIDATE_NAME}"

envsubst < base/cloudbuild.yaml.in > base/cloudbuild.yaml

gcloud beta container builds submit --config base/cloudbuild.yaml .

if [ "${UPLOAD_TO_STAGING}" = "true" ]; then
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:staging -q
fi

if [ ! -z "${NODE_VERSION_TAG}" ]; then
  gcloud beta container images add-tag ${IMAGE} ${DOCKER_NAMESPACE}/${RUNTIME_NAME}:${NODE_VERSION_TAG} -q
fi
