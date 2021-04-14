const EventParser       = require('./EventParser.js')
const Tail              = require('tail').Tail
const path              = require('path')
const fs                = require('fs')
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

        if (!fs.existsSync(filePath)) {
            console.log(`Warning: log file "${filePath}" doesn't exist\nMake sure you selected the right file in Configuration/NSMConfiguration.json Servers -> LOGFILE\n`)
        }

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

    async onLine(line) {
        this.Server.emit('line', line)
        this.Server.emit('stripped_line', line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), ''))

        const lines = line.split('\n').filter(l => l.length > 0)

        for (var i = 0; i < lines.length; i++) {
            const event = this.parseEvent(lines[i].trim())

            if (!event) return

            this.EventDispatcher.dispatchCallback(event)
        }
    }
}

module.exports = EventLogWatcher