#!/bin/bash
set -e

COMMIT_HASH=$(git rev-parse HEAD)
MSW_VERSION="0.0.0-$COMMIT_HASH"
echo "Latest commit: $COMMIT_HASH"
echo "In-progress MSW version: $MSW_VERSION"

PKG_JSON_COPY="package.json.copy"
cp package.json $PKG_JSON_COPY

pnpm version $MSW_VERSION --no-git-tag-version --allow-same-version

echo ""
echo "Packing MSW..."
pnpm pack

EXAMPLES_REPO=https://github.com/mswjs/examples.git
EXAMPLES_DIR=./examples
echo ""
echo "Cloning the examples from "$EXAMPLES_REPO"..."

if [[ -d "$EXAMPLES_DIR" ]]; then
  echo "Examples already cloned, skipping..."
else
  git clone $EXAMPLES_REPO $EXAMPLES_DIR
fi

echo ""
echo "Installing dependencies..."
cd $EXAMPLES_DIR
pnpm install 

echo ""
echo "Linking MSW..."
pnpm add msw --filter="with-*" file:../../../msw-$MSW_VERSION.tgz
pnpm ls msw

echo ""
echo "Running tests..."
CI=1 pnpm test ; (cd ../ && mv $PKG_JSON_COPY ./package.json)
