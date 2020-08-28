const EventParser   = require('./EventParser.js')
const ePlayer       = require('./Entity/ePlayer.js')
const md5           = require('md5')
const fs            = require('fs')
const readLastLines = require('read-last-lines')
const ws            = require('ws')
const _EventDispatcher = require('./EventDispatcher.js')

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
                var event = this.parseEvent(msg.data)
                this.EventDispatcher.dispatchCallback(event)
            }
        }
        catch (e) {
            this.Manager.logger.writeLn(`Remote log server generated an error: ${e.toString()}`)
        }

    }
}
module.exports = EventLogWatcher