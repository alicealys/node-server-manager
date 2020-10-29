const EventParser       = require('./EventParser.js')
const ws                = require('ws')
const _EventDispatcher  = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logServerURI, Server, Manager) {
        super(Server)
        this.previousMD5 = null
        this.logServerURI = logServerURI
        this.Server = Server
        this.Manager = Manager
        this.EventDispatcher = new _EventDispatcher(Server, Manager)
    }
    init () {
        try {
            var socket = new ws(this.logServerURI)
            
            socket.onmessage = (msg) => {
                this.onLine(msg.data)
            }
        }
        catch (e) {
            this.Manager.logger.writeLn(`Remote log server generated an error: ${e.toString()}`)
        }

    }
    async onLine(line) {
        line = line.replace(/[^\x20-\x7E]+/g, '')
        
        this.Server.Rcon.isRunning = true
        this.Server.emit('line', line)
        this.Server.emit('stripped_line', line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), ''))
        var event = this.parseEvent(line)

        if (!event) return

        this.EventDispatcher.dispatchCallback(event)
    }
}

module.exports = EventLogWatcher