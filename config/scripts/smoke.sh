#!/bin/bash
set -e

COMMIT_HASH=$(git rev-parse HEAD)
TARBALL_FILENAME="msw-$COMMIT_HASH.tgz"
LOCAL_PACKAGE_PATH="$PWD/$TARBALL_FILENAME"

echo "Mock Service Worker state at commit $COMMIT_HASH"

# Pack the local build of the `msw` package
echo "Packing 'msw' into $LOCAL_PACKAGE_PATH"
pnpm pack --pack-destination "$LOCAL_PACKAGE_PATH"

# Clone the examples repo.
# Use HTTPS protocol, because SSH would require a valid SSH key
# configured on the CircleCI side, which is unnecessary.
echo "Cloning the examples repository..."
git clone https://github.com/mswjs/examples.git ~/examples

# Bootstrap the examples monorepo
echo "Installing dependencies..."
cd ~/examples
pnpm install

# Use the local build of the `msw` package.
mv "$LOCAL_PACKAGE_PATH" "$TARBALL_FILENAME"

if [ "$pnpm_version" != "1.19.2" ]
then
  echo "Failed to install and use pnpm version 1.19.2"
  echo "Current version is $pnpm_version"
  exit 1
fi

echo "Using pnpm $pnpm_version"

echo "Installing the custom build of the 'msw' package..."
pnpm use-packed-msw "$TARBALL_FILENAME"

echo "Verifying that all examples use the custom build..."

# Verify that examples are using the custom version
examples=$(find examples/**/package.json)
read -ar examples_list <<< "$examples"
matches=$(grep "\"msw\": \"file:" examples/**/package.json || echo "")
read -ar deps_matches <<< "$matches"

if [ ${#examples_list[@]} -gt ${#deps_matches[@]} ]
then
  echo "Found some examples not using the custom msw build!"
  echo "The list of valid examples:"

  for i in "${deps_matches[@]}"
  do
    echo "$i"
  done

  exit 1
fi

echo "All examples are using the custom build of msw!"

# Test all the examples.
echo "Testing the usage examples..."
pnpm test

# Clean up
echo "Cleaning up..."
rm -rf ~/examples
