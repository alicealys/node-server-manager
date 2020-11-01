curl https://raw.githubusercontent.com/creationix/nvm/v0.11.1/install.sh | bash 
source ~/.nvm/nvm.sh
source ~/.profile
source ~/.bashrc

nvm install 14.15.0
mkdir -p Database
node ./Lib/NodeServerManager.js --trace-warnings
read -p 'Press any key to continue'
