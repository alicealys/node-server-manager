const EventParser   = require('./EventParser.js')
const ePlayer       = require('./Entity/ePlayer.js')
const md5           = require('md5')
const fs            = require('fs')
const readLastLines = require('read-last-lines')
const ws            = require('ws')
const _EventDispatcher = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logServer, Server, Manager) {
        super(Server)
        this.previousMD5 = null
        this.logServer = logServer
        this.Server = Server
        this.EventDispatcher = new _EventDispatcher(Server, Manager)
    }
    init () {
        try {
            var socket = new ws(`ws://${this.logServer.IP}:${this.logServer.PORT}/?key=${this.logServer.KEY}`)
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