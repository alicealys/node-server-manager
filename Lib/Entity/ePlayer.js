const EventEmitter = require('events')

class ePlayer extends EventEmitter {
    constructor (Guid, Name, Clientslot, IPAddress, Server) {
        super()
        this.Guid = Guid
        this.Name = Name
        this.IPAddress = IPAddress
        this.Clientslot = Clientslot
        this.Server = Server
        this.Server.Clients[Clientslot] = this
      }
      delete() {
        this.removeAllListeners()
      }
      async build() {
        await this.Server.DB.addClient(this.Guid)
        this.ClientId = await this.Server.DB.getClientId(this.Guid)
        await this.Server.DB.initializeStats(this.ClientId)
        this.PermissionLevel = await this.Server.DB.getClientLevel(this.ClientId)
        this.Server.DB.logConnection(this)
      }
      Tell (text) {
        this.Server.Rcon.executeCommandAsync(`tell ${this.Clientslot} ${text}`)
      }
      Kick (Message, Origin) {
        this.Server.Rcon.executeCommandAsync(`clientkick ${this.Clientslot} "${Message}"`)
  } 
}
module.exports = ePlayer