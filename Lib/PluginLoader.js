const fs = require('fs')
const path = require('path')

class PluginLoader {
    constructor(Server, that) {
        this.that = that
        this.Server = Server
        this.loadPluginsAsync()
    }
    loadPluginsAsync() {
        const directoryPath = path.join(__dirname, '../Plugins')
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
              return console.log('Unable to scan directory: ' + err);
          } 
          files.forEach( (file) => {
              console.log(`Loading plugin \x1b[33m${file}\x1b[0m for server ${this.Server.IP}:${this.Server.PORT}`)
              try {
                var plugin = require(path.join(__dirname, `../Plugins/${file}`))
                plugin.onLoad(this.Server, this)
              }
              catch (e) {
                console.log(`Error evaluating plugin \x1b[33m${file}\x1b[0m: \x1b[31m${e.toString()}\x1b[0m`)
              }
        
          });
        });
    }
}
module.exports = PluginLoader