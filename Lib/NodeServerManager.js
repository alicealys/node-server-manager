const fs                      = require('fs')
const path                    = require('path')
const configured              = fs.existsSync(path.join(__dirname, `../Configuration/NSMConfiguration.json`))

process.env.LOCALE = 'en'

const EventEmitter            = require('events')
const ConfigMaker             = require('./ConfigMaker.js')
const MasterServer = require('./MasterServer.js')

var Info = {
    Author: 'fed',
    Version: require('child_process').execSync('git rev-parse HEAD').toString().trim().substr(0, 6)
}

var Managers = []
var Id = 0

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

function COD2BashColor(string) {
    return string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), `\x1b[3$1m`)
}

console._log = (string) => {
    console.log(`${COD2BashColor(string)}\x1b[0m`)
}

class NSM extends EventEmitter{
    constructor (config) {
        super()
        this.config = config
        this.Version = Info.Version
        this.Author = Info.Author
        this.IP = config.IP
        this.PORT = config.PORT
        this.PASSWORD = config.PASSWORD
        this.LOGFILE = config.LOGFILE
        this.LOGSERVERURI = config.LOGSERVERURI
        this.logger = new Logger(path.join(__dirname, `../Log/`), `NSM-${this.IP}:${this.PORT}.log`)
        this.Server = null
        this.startAsync()
    }
    async startAsync() {
        this.RconConnection = new RconConnection(this.IP, this.PORT, this.PASSWORD, this.config.Gamename)
        this.Server = new Server(this.IP, this.PORT, this.RconConnection, Database, sessionStore, clientData, Managers, Id++, this, this.config)
        this.eventLogWatcher = this.LOGFILE ? new EventLogWatcher(this.LOGFILE, this.Server, this) : new ServerLogWatcher(this.LOGSERVERURI, this.Server, this)

        this.loadPlugins()
        
        await this.Server.setDvarsAsync()

        if (this.Server.Hostname) {
            console.log(`Now watching \x1b[33m${COD2BashColor(this.Server.Hostname)}\x1b[0m at \x1b[35m${this.IP}:${this.PORT}\x1b[0m`)
        } else {
            console.log(`Not watching \x1b[35m${this.IP}:${this.PORT}\x1b[0m: communication failed`)
            clearInterval(this.Server.HeartbeatInt)
            return
        }

        await this.Server.loadClientsAsync()
        this.eventLogWatcher.init()
        this.emit('ready')
    }
    log(string) {
        console.log(`[${new Date().toISOString()}] - - ${COD2BashColor(string)}`)
    }
    loadPlugins() {
        const directoryPath = path.join(__dirname, '../Plugins');
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            } 
            files.forEach( (file) => {
                if (!file.match(/.+\.js/g)) return
                this.logger.writeLn(`Loading plugin \x1b[33m${file}\x1b[0m for server ${this.Server.IP}:${this.Server.PORT}`)
                try {
                    let plugin = require(path.join(__dirname, `../Plugins/${file}`))
                    new plugin(this.Server, this, Managers)
                }
                catch (e) {
                    console.log(`Error evaluating plugin \x1b[33m${file}\x1b[0m: \x1b[31m${e.toString()}\x1b[0m`)
                }
            })
        })
    }
}

if (configured) {

    const configuration         = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`).toString())
    process.env.LOCALE          = configuration.locale ? fs.existsSync(path.join(__dirname, `../Configuration/Localization-${configuration.locale}.json`)) ? configuration.locale : 'en' : 'en'
    var RconConnection          = require('./RconConnection.js')
    var Server                  = require(path.join(__dirname, '../Lib/Entity/Server.js'))
    var Database                = new (require(path.join(__dirname, '../Lib/InitDatabase.js')))()
    var EventLogWatcher         = require('./EventLogWatcher.js')
    var ServerLogWatcher        = require('./ServerLogWatcher.js')
    var sessionStore            = new (require(path.join(__dirname, `../Webfront/SessionStore.js`)))()
    var clientData              = new (require(path.join(__dirname, `../Lib/ClientData.js`)))()

    process.env.config = JSON.stringify(require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)))
    process.env.Localization = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`))
    
    var commitId = require('child_process').execSync('git rev-parse HEAD').toString().trim()
    var lastCommit = require('child_process').execSync('git ls-remote https://github.com/fedddddd/node-server-manager.git HEAD').toString().split(/\s+/g)[0].trim()

    console.log(`+-------------------------------+`)
    console.log(`| \x1b[32mNode Server Manager\x1b[0m\t\t|`)
    console.log(`| \x1b[33m${Info.Version}\x1b[0m\t\t\t|`)
    console.log(`| By \x1b[34m${Info.Author}\x1b[0m\t\t\t|`)
    console.log(`+-------------------------------+`)

    console._log(commitId == lastCommit 
        ? '^2Node Server Manager is up to date' 
        : `^3An update is available (v${commitId.substr(0, 6)}, run git pull to update)`)

    console.log(`Environment: ${process.env.NODE_ENV == 'dev' ? 'Development' : 'Production'}`)

    configuration.Servers.forEach(config => {
        Managers.push(new NSM(config))
    })

    var masterServer = new (require('./MasterServer.js'))(Managers)

    for (var i = 0; i < Managers.length; i++) {
        Managers[i].Server.masterServer = masterServer
    }

    async function loadGlobalPlugins() {
        const directoryPath = path.join(__dirname, '../Plugins/Global');
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            } 
            files.forEach( (file) => {
                if (!file.match(/.+\.js/g)) return
                try {
                    let plugin = require(path.join(__dirname, `../Plugins/Global/${file}`))
                    new plugin(Managers)
                }
                catch (e) {
                    console.log(`Error evaluating plugin \x1b[33m${file}\x1b[0m: \x1b[31m${e.toString()}\x1b[0m`)
                }
            })
        })
    }

    loadGlobalPlugins()

    const _Webfront = require(path.join(__dirname, `../Webfront/Webfront.js`))

    configuration.Webfront && (Webfront = new _Webfront(Managers, { 
        SSL: configuration.WebfrontSSL, 
        Key: configuration['WebfrontSSL-Key'], 
        Cert: configuration['WebfrontSSL-Cert'], 
        Port: configuration.WebfrontPort, 
        Hostname: configuration.WebfrontHostname, 
    }, sessionStore, Database))

    new (require('./CLICommands.js'))(Managers[0], Managers)
    
    masterServer.init()
} else {
    var configMake = new ConfigMaker()
    configMake.init()
}

