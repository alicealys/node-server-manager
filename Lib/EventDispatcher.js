const ePlayer       = require('./Entity/ePlayer.js')
const wait          = require('delay')

class EventDispatcher {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
    }
    async dispatchCallback(event) {
        if (!event) return

        try {
            this.Server.emit('event', event)
            this.Server.uptime = event.data.TimeOffset

            if (this.Server.previousUptime > this.Server.uptime) {
                this.Server.previousUptime = this.Server.uptime
                this.Server.loadClientsAsync()
                this.Server.emit('reload')
                return
            }

            switch (event.type) {
                case 'init':
                    this.Server.emit('init')
                break
                case 'say':
                    if (!event.data.Origin.Clientslot || !this.Server.Clients[event.data.Origin.Clientslot]) return

                    var Player = this.Server.Clients[event.data.Origin.Clientslot]
                    Player.emit('message', event.data.Message)

                    this.Server.emit('message', Player, event.data.Message)
                    this.Server.emit('any_event', {type: 'say', Origin: this.Server.Clients[event.data.Origin.Clientslot], Data: event.data.Message})
                break
                case 'join':
                    if (this.Server.Clients[event.data.Origin.Clientslot] != null 
                        && this.Server.Clients[event.data.Origin.Clientslot].Guid == event.data.Origin.Guid) {

                        this.Server.Clients[event.data.Origin.Clientslot].matchData = {}

                        this.Server.emit('preconnect', this.Server.Clients[event.data.Origin.Clientslot])
                        this.Server.emit('any_event', {type: 'join', Origin: this.Server.Clients[event.data.Origin.Clientslot]})
                        return
                    }

                    for (var i = 0; i < this.Server.Clients.length; i++) {
                        if (!this.Server.Clients[i]) continue

                        if (this.Server.Clients[i].Guid == event.data.Origin.Guid && this.Server.Clients[i].Clientslot != event.data.Origin.Clientslot) {
                            this.Server.Clients[i].removeAllListeners()
                            this.Server.Clients[i] = null
                        }
                    }

                    await wait(100)

                    try { 
                        var IPAddress = (await this.Server.Rcon.getClientByGuid(event.data.Origin.Guid)).address
                    } 
                    catch (e) {}

                    var Player = new ePlayer(event.data.Origin.Guid, event.data.Origin.Name, event.data.Origin.Clientslot, IPAddress, this.Server)
                    await Player.build()
                    
                    this.Server.emit('connect', Player)
                    this.Server.emit('any_event', {type: 'join', Origin: Player})
              break
              case 'quit':
                    this.Server.emit('event', {type: 'quit', Origin: this.Server.Clients[event.data.Origin.Clientslot]})
                    
                    if (!event.data.Origin.Clientslot || !this.Server.Clients[event.data.Origin.Clientslot]) return

                    for (var i = 0; i < this.Server.Clients.length; i++) {
                        if (!this.Server.Clients[i]) continue

                        if (this.Server.Clients[i].Guid == event.data.Origin.Guid && this.Server.Clients[i].Clientslot != event.data.Origin.Clientslot) {
                            this.Server.Clients[i].removeAllListeners()
                            this.Server.Clients[i] = null
                        }
                    }

                    this.Server.emit('disconnect', Object.assign({}, this.Server.Clients[event.data.Origin.Clientslot]))

                    this.Server.Clients[event.data.Origin.Clientslot].removeAllListeners()
                    this.Server.Clients[event.data.Origin.Clientslot] = null
              break

              case 'kill':
                var Target = this.Server.Clients[event.data.Target.Clientslot]
                var Attacker = (event.data.Origin.Clientslot && event.data.Origin.Clientslot >= 0) ? this.Server.Clients[event.data.Origin.Clientslot] : Target
                
                Attacker.Clientslot != Target.Clientslot ? Attacker.emit('kill', Target, event.data.Attack) : Attacker.emit('death', Attacker, event.data.Attack)
                Attacker.Clientslot != Target.Clientslot ? this.Server.emit('any_event',  { type:'kill', Origin: Attacker, Attack: event.data.Attack }) : this.Server.emit('any_event',  { type:'death', Origin: Attacker, Attack: event.data.Attack })

                Target.emit('death', Attacker, event.data.Attack)

                this.Server.emit('any_event', {type: 'death', Origin: Target})
  
                this.Server.emit('death', Target, Attacker, event.data.Attack)
              break

            }
            this.Server.previousUptime = event.data.TimeOffset
        }
        catch (e) {
            this.Manager.logger.writeLn(`Error occurred while dispatching event`)
        }
    }
}

module.exports = EventDispatcher