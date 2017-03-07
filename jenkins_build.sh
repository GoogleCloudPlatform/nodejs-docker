
if [ -z "${DOCKER_NAMESPACE}" ]; then
  echo "The DOCKER_NAMESPACE environment variable must be set when "
  echo "running this script."
  exit 1
fi

echo "gcloud --version"
gcloud --version

echo "gcloud docker -- version"
gcloud docker -- version

echo "DOCKER_NAMESPACE:${DOCKER_NAMESPACE}"

if [ -z "${TAG}" ]; then
  TAG=`date +%Y-%m-%d_%H_%M`
fi

CANDIDATE_NAME="${TAG}"
echo "CANDIDATE_NAME:${CANDIDATE_NAME}"

cd base
echo "Building the base image"
./build.sh "${DOCKER_NAMESPACE}" "${CANDIDATE_NAME}"
cd ..

cd builder
echo "Building the Flex Runtime Builder"
./build.sh "${DOCKER_NAMESPACE}" "${CANDIDATE_NAME}"
cd ..
