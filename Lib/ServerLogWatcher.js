const EventParser       = require('./EventParser.js')
const ws                = require('ws')
const _EventDispatcher  = require('./EventDispatcher.js')

class EventLogWatcher extends EventParser {
    constructor (logServerURI, Server, Manager) {
        super(Server)
        this.logServerURI = logServerURI
        this.Server = Server
        this.Manager = Manager
        this.EventDispatcher = new _EventDispatcher(Server, Manager)
    }
    async init () {
        try {
            var socket = new ws(this.logServerURI)
            
            socket.onmessage = async (msg) => {
                this.onLine(msg.data)
            }

            socket.on('error', (error) => {
                console.log(`Server Log Watcher: ${error}`)
            })

            socket.onclose = async () => {
                console.log(`Connection to log server (${this.logServerURI}) lost, reconnecting in 15 seconds...`)

                setTimeout(() => {
                    this.init()
                }, 15 * 1000)
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