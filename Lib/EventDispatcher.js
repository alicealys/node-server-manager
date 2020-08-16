const ePlayer       = require('./Entity/ePlayer.js')

class EventDispatcher {
    constructor(Server) {
        this.Server = Server
    }
    async dispatchCallback(event) {
        if (!event) return
        this.Server.emit('event', event)
        switch (event.type) {
            case 'InitGame':
              this.Server.emit('init');
              this.Server.Mapname = await this.Server.Rcon.getDvar('mapname')
            break;
            case 'say':
              var Player = this.Server.Clients[event.data.Origin.Clientslot];
              Player.emit('message', event.data.Message);
              this.Server.emit('message', Player, event.data.Message)
            break;
            case 'join':
              if (this.Server.Clients[event.data.Origin.Clientslot] != null && this.Server.Clients[event.data.Origin.Clientslot].Guid == event.data.Origin.Guid) return
              try { var IPAddress = await this.Server.Rcon.getClientByName(event.data.Origin.Name).IPAddress } catch (e) {}
              var Player = new ePlayer(event.data.Origin.Guid, event.data.Origin.Name, event.data.Origin.Clientslot, IPAddress, this.Server);
              await Player.build()
              this.Server.emit('connect', Player);
            break;
            case 'quit':
              this.Server.emit('disconnect', this.Server.Clients[event.data.Origin.Clientslot])
              this.Server.Clients[event.data.Origin.Clientslot].removeAllListeners()
              this.Server.Clients[event.data.Origin.Clientslot] = null;
            break;
            case 'kill':
              var Target = this.Server.Clients[event.data.Target.Clientslot];
              // If player suicided Attacker = Victim
              var Attacker = (event.data.Origin.Clientslot && event.data.Origin.Clientslot >= 0) ? this.Server.Clients[event.data.Origin.Clientslot] : Target;
              
              Attacker.Clientslot != Target.Clientslot ? Attacker.emit('kill', Target, event.data.Attack) : Attacker.emit('death', Attacker, event.data.Attack)
      
              Target.emit('death', Attacker, event.data.Attack);

              this.Server.emit('death', Target, Attacker, event.data.Attack)
            break;
          }
    }
}
module.exports = EventDispatcher