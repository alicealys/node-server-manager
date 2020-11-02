#!/bin/bash

echo "Checking for updates..."
latest=$(git ls-remote https://github.com/fedddddd/node-server-manager.git HEAD | awk '{print $1}')
local=$(git rev-parse HEAD)

if [[ "$latest" != "$local" ]]; then
    read -p "An update is available, update? " update
    if [[ "$update" == *"y"* ]]; then
        git pull
    fi
fi

echo "Running node-server-manager v$local"

echo "Checking for nodejs updates..."

curl https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh --silent | bash > /dev/null

source ~/.nvm/nvm.sh
source ~/.profile
source ~/.bashrc

nvm install node

mkdir -p Database
node ./Lib/NodeServerManager.js
read -p 'Press any key to continue'