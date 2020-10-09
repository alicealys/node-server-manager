const path                              = require('path')
const { Command, NodeServerManager }    = require(path.join(__dirname, `../Lib/Classes.js`))

class Plugin {
    constructor(Server) {
        this.Server = Server
        this.Server.on('line', this.onLine.bind(this))
    }
    async onLine(line) {
        line = line.replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '').trim()
        if (this.isJson(line)) {
            var event = JSON.parse(line)
            
            switch (event.command) {
                case 'tempban':
                    var Client = await this.Server.DB.getClientByGuid(event.target)

                    this.Server.DB.addPenalty({
                        TargetId: Client.ClientId,
                        OriginId: NodeServerManager.ClientId,
                        PenaltyType: 'PENALTY_TEMP_BAN',
                        Duration: event.duration,
                        Reason: event.reason
                    })
        
                    this.Server.emit('penalty', 'PENALTY_TEMP_BAN', Client, event.reason, NodeServerManager, event.duration)
                break
            }
        }
    }
    isJson(data) {
        try {
            JSON.parse(data)
        }
        catch (e) {
            return false
        }
        return true
    }
}

module.exports = Plugin