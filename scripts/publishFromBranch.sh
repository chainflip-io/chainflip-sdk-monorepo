#!/bin/bash
set -e

usage() {
  echo "Usage: $0 -p <package> -t <tag>"
  echo "  -p, --package   Package to publish (sdk or cli)"
  echo "  -t, --tag       NPM dist-tag (e.g., alpha, beta, dev). Cannot be 'latest'."
  exit 1
}

PACKAGE=""
TAG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--package) PACKAGE="$2"; shift 2 ;;
    -t|--tag) TAG="$2"; shift 2 ;;
    *) usage ;;
  esac
done

if [[ -z "$PACKAGE" || -z "$TAG" ]]; then
  usage
fi

if [[ "$PACKAGE" != "sdk" && "$PACKAGE" != "cli" ]]; then
  echo "Error: Package must be 'sdk' or 'cli'"
  exit 1
fi

if [[ "$TAG" == "latest" ]]; then
  echo "Error: Cannot use 'latest' tag for branch publishes"
  exit 1
fi

BRANCH=$(git branch --show-current)

if [[ "$BRANCH" == "main" ]]; then
  echo "Error: Cannot publish from main branch"
  exit 1
fi

echo "Triggering publish workflow..."
echo "  Package: $PACKAGE"
echo "  Tag:     $TAG"
echo "  Branch:  $BRANCH"

gh workflow run ci-npm-publish.yml --ref "$BRANCH" -f npm_tag="$TAG" -f package="$PACKAGE"

echo "Waiting for workflow to start..."
sleep 3

RUN_ID=$(gh run list --workflow=ci-npm-publish.yml --branch="$BRANCH" --limit=1 --json databaseId --jq '.[0].databaseId')

if [[ -z "$RUN_ID" ]]; then
  echo "Could not find workflow run. Check manually at:"
  echo "https://github.com/chainflip-io/chainflip-sdk-monorepo/actions/workflows/ci-npm-publish.yml"
  exit 1
fi

echo "Watching run $RUN_ID..."
gh run watch "$RUN_ID"
