#!/bin/bash
npm run generate-docs

if [ -n "$(git status --short)" ]; then
  echo -e "\033[0;31m[error]\033[0m Changes found in auto-generated docs.  Run 'npm run generate-docs', commit, and try again."
  exit 1
else
  exit 0
fi