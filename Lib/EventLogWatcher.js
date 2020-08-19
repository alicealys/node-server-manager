const EventParser   = require('./EventParser.js')
const ePlayer       = require('./Entity/ePlayer.js')
const md5           = require('md5')
const fs            = require('fs')
const readLastLines = require('read-last-lines')
const _EventDispatcher = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logfile, Server) {
        super(Server)
        this.previousMD5 = null
        this.logfile = logfile
        this.Server = Server
    }
    init () {
        fs.watch(this.logfile, async (event, filename) => {
            if (filename) {
              var lastLine = await readLastLines.read(this.logfile, 1)
              var event = this.parseEvent(lastLine)
              var currentMD5 = md5(await readLastLines.read(this.logfile, 4))
          
              if (!event || this.previousMD5 == currentMD5) return;
          
              this.previousMD5 = currentMD5;
              
              var EventDispatcher = new _EventDispatcher(this.Server)
              EventDispatcher.dispatchCallback(event)
            } 
        });
    }
}
module.exports = EventLogWatcher