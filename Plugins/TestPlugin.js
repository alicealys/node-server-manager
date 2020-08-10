var plugin = {
    Server: null,
    playerCommand: function (Player, args) {
        var lookup = {
          'COMMAND_NOT_FOUND' : 'Command not found, type ^3#help^7 for a list of commands',
          'COMMAND_HELP': 'Display the list of commands',
          'COMMAND_PING': 'Pings the server'
        }
        var commands = {
          'help': {
            description: 'COMMAND_HELP',
            callback: function (Player) {
              var commandsArray = Object.entries(commands);
              var i = 0, interval = setInterval(() => {
                Player.tell(`^7[^6${commandsArray[i][0]}^7] ${lookup[commandsArray[i][1].description]}`)
                i++;
                if (i > commandsArray.length - 1) clearInterval(interval)
              }, 300)
            }
          },
          'ping': {
            description: 'COMMAND_PING',
            callback: function (Player) {
              Player.tell('pong')
            }
          }
        };
        switch (true) {
          case (!commands[args[0]]):
            Player.tell(lookup.COMMAND_NOT_FOUND)
            return;
        }
        commands[args[0]].callback(Player)
    },
    onEventAsync: function(event) {
      // Generic game event
      /*
        event: {
          type: message, kill, death, quit, join
          data: {
            Origin: {Name, Guid, IPAddress, Clientslot}
            Target: {Name, Guid, IPAddress, Clientslot}
            Attack: {Weapon, Damage, HitLoc, MOD}
          }
        }
      */
    },
    playerConnected: async function(Player) {
        // Specific game events on players
        /*Player.on("kill", (Victim, Attack) => {
          kills++
          killstreak++;
          console.log(`\x1b[33m${Player.Name}\x1b[0m killed \x1b[31m${Victim.Name}\x1b[0m using \x1b[32m${Attack.Weapon}\x1b[0m by dealing \x1b[33m${Attack.Damage}\x1b[0m damage in \x1b[35m${Attack.HitLoc}\x1b[0m, deaths: \x1b[34m${kills}\x1b[0m`)
        });
        Player.on("death", (Attacker, Attack) => {
          deaths++;
          killstreak = 0;
          console.log(`\x1b[33m${Player.Name}\x1b[0m was killed by \x1b[31m${Attacker.Name}\x1b[0m using \x1b[32m${Attack.Weapon}\x1b[0m by dealing \x1b[33m${Attack.Damage}\x1b[0m damage in \x1b[35m${Attack.HitLoc}\x1b[0m, deaths: \x1b[34m${deaths}\x1b[0m`)
        });
        Player.on("message", (Message) => {
          if (Message.startsWith('#')) this.playerCommand(Player, Message.substr(1).split(/\s+/))
          console.log(`\x1b[36m${Player.Name}\x1b[0m said \x1b[32m${Message}\x1b[0m`)
        });*/
        //var ClientId = await plugin.Server.DB.getClientId(Player.Guid)
        console.log(`\x1b[36m${Player.Name}\x1b[0m with ClientId ${Player.ClientId} has joined`)
      },
      playerDisconnect: function (Player) {
        console.log(`\x1b[36m${Player.Name}\x1b[0m has left`)
      },
      init: function() {
        this.Server.on('connect', this.playerConnected);
        this.Server.on('disconnect', this.playerDisconnect);
    },
    onLoad: function(Server, Logger) {
      this.Server = Server
      this.init()
    }
}
module.exports = plugin