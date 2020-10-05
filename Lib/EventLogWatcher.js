const EventParser       = require('./EventParser.js')
const Tail              = require('tail').Tail
const path              = require('path')
const _EventDispatcher  = require('./EventDispatcher.js')
const spawn             = require('child_process').spawn

class EventLogWatcher extends EventParser {
    constructor (logfile, Server, Manager) {
        super(Server)
        this.previousMD5 = null
        this.logfile = logfile
        this.Server = Server
        this.EventDispatcher = new _EventDispatcher(Server, Manager)
    }
    init () {
        var filePath = path.resolve(this.logfile)

        if (process.platform == 'win32') {
            var tail = spawn(`powershell`, ['-command', 'get-content', '-wait', '-Tail 0', `"${filePath}"`])
            tail.stdout.on('data', (data) => {
                this.onLine(data.toString())
            })
            return
        }
        
        var tail = new Tail(filePath)
        tail.watch()

        tail.on('line', this.onLine.bind(this))
    }
    onLine(line) {
        this.Server.emit('line', line)
        var event = this.parseEvent(line)
        if (!event) return
        this.EventDispatcher.dispatchCallback(event)
    }
}
module.exports = EventLogWatcher