const EventParser   = require('./EventParser.js')
const ePlayer       = require('./Entity/ePlayer.js')
const md5           = require('md5')
const fs            = require('fs')
const readLastLines = require('read-last-lines')
const ws            = require('ws')
const _EventDispatcher = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logServer, Server) {
        super(Server)
        this.previousMD5 = null
        this.logServer = logServer
        this.Server = Server
    }
    init () {
        try {
            var socket = new ws(`ws://${this.logServer.IP}:${this.logServer.PORT}/?key=${this.logServer.KEY}`)
            socket.onmessage = (msg) => {
                var event = this.parseEvent(msg.data)
                var EventDispatcher = new _EventDispatcher(this.Server)
                EventDispatcher.dispatchCallback(event)
            }
        }
        catch (e) {
            console.log(`Remote log server generated an error: ${e.toString()}`)
        }

    }
}
module.exports = EventLogWatcher