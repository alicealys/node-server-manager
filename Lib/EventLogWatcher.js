const EventParser   = require('./EventParser.js')
const Tail          = require('tail').Tail
const md5           = require('md5')
const fs            = require('fs')
const readLastLines = require('read-last-lines')
const _EventDispatcher = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logfile, Server, Manager) {
        super(Server)
        this.previousMD5 = null
        this.logfile = logfile
        this.Server = Server
        this.EventDispatcher = new _EventDispatcher(Server, Manager)
    }
    init () {
        var tail = new Tail(this.logfile)
        tail.watch()
        tail.on('line', (data) => {
            this.Server.emit('line', data)
            var event = this.parseEvent(data)
            if (!event) return
            this.EventDispatcher.dispatchCallback(event)
        })
    }
}
module.exports = EventLogWatcher