const fs                      = require('fs');
const RconConnection          = require('./RconConnection.js')
const path                    = require('path');
const Server                  = require(path.join(__dirname, '../Lib/Entity/Server.js'))
const _Database               = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const EventLogWatcher         = require('./EventLogWatcher.js')
const ServerLogWatcher        = require('./ServerLogWatcher.js')
const ConfigMaker             = require('./ConfigMaker.js');
const _CLICommands            = require('./CLICommands.js')
const sessionStore            = new (require(path.join(__dirname, `../Webfront/SessionStore.js`)))()             

var Info = {
  Author: 'fed',
  Version: '0.2'
}

var Managers = []
var Webfront = null

class Logger {
  constructor(dirName, fileName) {
    this.fileName = fileName
    this.dirName = dirName
  }
  writeLn(data) {
    if (!fs.existsSync(this.dirName)) {
      fs.mkdirSync(this.dirName)
    }

    data = `[Log] ${new Date()} - - ${data}\n`
    fs.appendFile(path.join(this.dirName, this.fileName), data, (err) => {
      if (err) console.log(err)
    })
  }
}

class NSM {
  constructor (configuration) {
    this.Version = Info.Version
    this.Author = Info.Author
    this.IP = configuration.IP
    this.PORT = configuration.PORT
    this.PASSWORD = configuration.PASSWORD
    this.LOGFILE = configuration.LOGFILE
    this.LOGSERVERURI = configuration.LOGSERVERURI
    this.logger = new Logger(path.join(__dirname, `../Log/`), `NSM-${this.IP}:${this.PORT}.log`)
    this.Server = null
    this.loadedPlugins = {}
    this.StartAsync()
  }
  async StartAsync() {

    // Connect to the server's rcon
    this.RconConnection = new RconConnection(this.IP, this.PORT, this.PASSWORD)
    this.Server = new Server(this.IP, this.PORT, this.RconConnection, new _Database(), sessionStore)
    this._EventLogWatcher = this.LOGFILE ? new EventLogWatcher(this.LOGFILE, this.Server, this) : new ServerLogWatcher(this.LOGSERVERURI, this.Server, this)

    // Load plugins before initializing Server.Clients
    this.LoadPlugins()

    // Load Server Dvars
    await this.Server.setDvarsAsync()

    if (this.Server.Hostname) {
      console.log(`Now watching \x1b[33m${this.Server.Hostname}\x1b[0m at \x1b[35m${this.IP}:${this.PORT}\x1b[0m`)
    } else {
      console.log(`Not watching \x1b[35m${this.IP}:${this.PORT}\x1b[0m: communication failed`)
      clearInterval(this.Server.HeartbeatInt)
      return
    }

    // Load Client from status command
    await this.Server.loadClientsAsync()
    //this.Server.Broadcast('^3NSM^7 is now ^2ONLINE')

    // Start watching log
    this._EventLogWatcher.init()
  }
  LoadPlugins() {
    const directoryPath = path.join(__dirname, '../Plugins');
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
          return console.log('Unable to scan directory: ' + err);
      } 
      files.forEach( (file) => {
          this.logger.writeLn(`Loading plugin \x1b[33m${file}\x1b[0m for server ${this.Server.IP}:${this.Server.PORT}`)
          try {
            let plugin = require(path.join(__dirname, `../Plugins/${file}`))
            new plugin(this.Server, this, Managers)
          }
          catch (e) {
            console.log(`Error evaluating plugin \x1b[33m${file}\x1b[0m: \x1b[31m${e.toString()}\x1b[0m`)
          }
  
      });
    });
  }
}

if (fs.existsSync(path.join(__dirname, `../Configuration/NSMConfiguration.json`))) {

  const configuration = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`).toString())

  console.log("============================================================")
  console.log(`                 Node Server Manager v${Info.Version}`)
  console.log(`                         By ${Info.Author}`)
  console.log("============================================================")


  configuration.Servers.forEach(config => {
     Managers.push(new NSM(config))
  })

  const _Webfront = require(path.join(__dirname, `../Webfront/Webfront.js`))

  configuration.Webfront && (Webfront = new _Webfront(Managers, { 
    SSL: configuration.WebfrontSSL, 
    Key: configuration['WebfrontSSL-Key'], 
    Cert: configuration['WebfrontSSL-Cert'], 
    Port: configuration.WebfrontPort, 
    Hostname: configuration.WebfrontHostname, 
  }, sessionStore))
} else {
  var configMake = new ConfigMaker()
  configMake.init()
}

var CLICommands = new _CLICommands(Managers[0])