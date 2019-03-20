#!/bin/bash

# Setup gcloud and auth
export KOKORO_GITHUB_DIR=${KOKORO_ROOT}/src/github
source ${KOKORO_GFILE_DIR}/kokoro/common.sh

cache_dir=node_packages
shasums_file=SHASUMS256.txt.asc
mkdir -p $cache_dir

function retry {
  local n=1
  local max=5
  local delay=5
  while true; do
    "$@" && break || {
      if [[ $n -lt $max ]]; then
        n=$n+1
        echo "Command $@ failed. Retrying."
        sleep $delay
      else
        code=$?
        echo "Command $@ failed $max times."
        exit $code
      fi
    }
  done
}

# Node
echo "Checking node versions..."
versions=$(curl -L https://nodejs.org/dist/ | egrep -o "v[0-9]+\\.[0-9]+\\.[0-9]+")
for version in $versions;
do
    file_name=node-$version-linux-x64.tar.gz
    # Need to compare each version part separately since lexographic comparison
    # doesn't work
    versionNum=${version#"v"}
    versionArr=(${versionNum//./ })
    if [[ -f $cache_dir/$file_name  || ( "${versionArr[0]}" -eq "0" && ( "${versionArr[1]}" -lt "8" || ( "${versionArr[1]}" -eq "8" && "${versionArr[2]}" -lt "6" ) ) ) || "$version" == "v0.9.0" ]];
    then
        echo "Skipping download of $file_name"
    else
        echo "Downloading $file_name"
        retry wget -nv -O $cache_dir/$file_name https://nodejs.org/dist/$version/$file_name

        # For Node.js version v0.10 and higher, only Node.js version v0.10.7
        # does not have a SHASUMS256.txt.asc file.
        #
        # Node.js versions v0.8.x where x <= 22 do not have SHASUMS256.txt.asc
        # files.
        #
        # Note.js versions v0.9.x for all x do not have SHASUMS256.txt.asc
        # files.
        #
        # Code that relies on the existance of SHASUMS256.txt.asc files in the
        # mirror will itself need to account for the file not existing for
        # specific node versions.
        if [[ "${version}" != "v0.10.7" && ! ( "${versionArr[0]}" -eq "0" && "${versionArr[1]}" -eq "9" ) && ! ( "${versionArr[0]}" -eq "0" && "${versionArr[1]}" -eq "8" && "${versionArr[2]}" -le "22" ) ]];
        then
            echo "Downloading $shasums_file for version $version"
            retry wget -nv -O $cache_dir/$version-$shasums_file https://nodejs.org/dist/$version/$shasums_file
        else
            echo "Skipping downloading $shasums_file for version $version as it is known not to exist"
        fi
    fi
done
echo "$versions" >$cache_dir/node_versions

# iojs
echo "Checking iojs versions..."
versions=$(curl -L https://iojs.org/dist/ | egrep -o "v[0-9]+\\.[0-9]+\\.[0-9]+")
for version in $versions;
do
    file_name=iojs-$version-linux-x64.tar.gz
    if [ -f $cache_dir/$file_name ];
    then
        echo "Skipping download of $file_name"
    else
        echo "Downloading $file_name"
        retry wget -nv -O $cache_dir/$file_name https://iojs.org/dist/$version/$file_name

        echo "Downloading $shasums_file for version $version"
        retry wget -nv -O $cache_dir/$version-$shasums_file https://iojs.org/dist/$version/$shasums_file
    fi
done
echo "$versions" >$cache_dir/iojs_versions

# Remove empty files from the cache
for file in $cache_dir/*; do
  if [ ! -s "$file" ]; then
    echo "Removing empty file $file"
    rm $file
  fi
done

# TODO(mmuller): Use npm for this somehow.
retry wget -nv -O $cache_dir/semver.tar.gz http://registry.npmjs.org/semver/-/semver-5.0.3.tgz

echo "Syncing..."
gsutil -m rsync -r -d $cache_dir gs://$bucket

echo "Syncing to extra bucket..."
gsutil -m rsync -r -d gs://$bucket gs://$extra_bucket
