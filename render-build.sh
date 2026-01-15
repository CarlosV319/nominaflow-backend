#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Install latest Chrome for Puppeteer
npx puppeteer browsers install chrome
