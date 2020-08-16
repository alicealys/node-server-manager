const moment = require('moment')
const path = require('path')
const crypto = require('crypto')
const delay = require('delay')
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    this.init()
  }
  getRoleFrom (Value, Type) {
    switch (Type) {
      case 0:
        var RolesArray = Object.entries(Permissions.Roles)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1].toLocaleLowerCase() == Value.toLocaleLowerCase()) {
            return {
              Name: RolesArray[i][1],
              Level: Permissions.Levels[RolesArray[i][0]]
            }
          }
        }
      break;
      case 1:
        var RolesArray = Object.entries(Permissions.Levels)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1] == Value) {
            return {
              Name: Permissions.Roles[RolesArray[i][0]],
              Level: RolesArray[i][1]
            }
          }
        }
      break;
    }
    return false
  }
  onEventAsync (event) {
    switch (event.type) {
        case 'say':
          if (event.data.Message.startsWith('.')) this.playerCommand(event.data.Origin, event.data.Message.substr(1).split(/\s+/))
        break;
    }
  }
  init () {
      this.Server.on('event', this.onEventAsync.bind(this));
  }
  playerCommand (Player, args) {
      var lookup = {
        'COMMAND_NOT_FOUND' : 'Command not found, type ^3#help^7 for a list of commands',
        'COMMAND_ARGUMENT_ERROR' : 'Not enough arguments supplied',
        'COMMAND_CLIENT_NOT_FOUND' : 'Player not found',
        'ROLE_HIERARCHY_ERROR' : 'You can\'t set that role',
        'CLIENT_HIERARCHY_ERROR': 'You cannot execute this on that client',
        'COMMAND_EXECUTE_SUCCESS' : 'Command executed successfully',
        'ROLE_SELF_ERROR' : 'You can\'t set your own role',
        'COMMAND_STATS_FORMAT' : '[ ^5%NAME% ^7] => ^5%KILLS%^7 Kills | ^5%DEATHS% ^7Deaths | ^5%KDR% ^7KDR | ^5%PERFORMANCE%^7 Performance | ^7Play time ^5%PLAYEDTIME%',
        'COMMAND_FORBIDDEN' : 'You don\'t have enough permissions for this',
        'ROLE_NOT_EXIST' : 'Specified role doesn\'t exist',
        'COMMAND_HELP': 'Display the list of commands',
        'COMMAND_PING': 'Pings the server',
        'COMMAND_TP' : 'Teleport to player',
        'COMMAND_TPHERE' : 'Teleport player to you',
        'COMMAND_SETROLE' : 'Set player\'s role',
        'COMMAND_RCON' : 'Execute rcon commands',
        'COMMAND_STATS': 'Returns your stats',
        'COMMAND_OWNER': 'Claim ownership of a server',
        'COMMAND_KICK': 'Kick a player, usage: kick <ClientId>',
        'COMMAND_FIND': 'Find a players\'s ID',
        'COMMAND_INFO': 'Get NSM info',
        'COMMAND_TOKEN_FORMAT': 'Your login token is %TOKEN%, valid for 2 minutes, your ClientID is ^2%CLIENTID%^7 { ^5numbers^7, ^3letters^7 }',
        'COMMAND_PARSE_TIME_ERROR': 'Could not parse time, format: 1d (day), 2h (hours), 3m (mins), 10s (secs)'
      }
      var commands = {
        'help': {
          ArgumentLength: 0,
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: async (Player) => {
            var commandsArray = Object.entries(commands);
            for (var i = 0; i < commandsArray.length; i++) {
              Player.Tell(`^7[^6${commandsArray[i][0]}^7] ${lookup[`COMMAND_${commandsArray[i][0].toLocaleUpperCase()}`]}`)
              await delay(500)
            }
          }
        },
        'ping': {
          ArgumentLength: 0,
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: function (Player) {
            Player.Tell('pong')
          }
        },
        'info': {
          ArgumentLength: 0,
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: (Player) => {
            Player.Tell(`Node Server Manager - v${this.Manager.Version} by ${this.Manager.Author}`)
          }
        },
        'stats': {
          ArgumentLength: 0,
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: async (Player, args) => {
            var ClientId = !args[1] ? Player.ClientId : args[1]
            var Stats = await this.Server.DB.getPlayerStatsTotal(ClientId)
            var OtherStats = await this.Server.DB.getPlayerStats(ClientId)
            if (Stats)
              Player.Tell(lookup.COMMAND_STATS_FORMAT
              .replace('%PLAYEDTIME%', this.timeConvert(Stats.PlayedTime))
              .replace('%PERFORMANCE%', Stats.Performance.toFixed(2))
              .replace('%NAME%', OtherStats.Player.Name)
              .replace('%KILLS%', Stats.Kills)
              .replace('%DEATHS%', Stats.Deaths)
              .replace('%KDR%',(Stats.Kills / Math.max(Stats.Deaths, 1)).toFixed(2)))
            else Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
          }
        },
        'token': {
          ArgumentLength: 0,
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: async (Player) => {
            var rawToken = crypto.randomBytes(3).toString('hex').toLocaleUpperCase();
            rawToken = rawToken.split('')
            var formattedToken = []
            rawToken.forEach(char => {
              if (Number.isInteger(parseInt(char))) {
                formattedToken.push(`^5${char}^7`)
              } else {
                formattedToken.push(`^3${char}^7`)
              }
            })
            Player.Tell(lookup.COMMAND_TOKEN_FORMAT
              .replace('%CLIENTID%', Player.ClientId)
              .replace('%TOKEN%', formattedToken.join('')))
            await this.Server.DB.createToken(Player.ClientId, rawToken.join(''))
          }
        },
        'rcon': {
          ArgumentLength: 1,
          Permission: Permissions.Commands.COMMAND_RCON,
          callback: async (Player, args) => {
            var result = (await this.Server.Rcon.executeCommandAsync(args.slice(1).join(' '))).split('\n')
            result[0] = lookup.COMMAND_EXECUTE_SUCCESS
            for (var i = 0; i < result.length; i++) {
              Player.Tell(result[i])
              await delay(300)
            }
          }
        },
        'tp': {
          ArgumentLength: 1,
          Permission: Permissions.Commands.COMMAND_TP,
          callback: async (Player, args) => {
            var Client = await this.Server.DB.getClient(args[1])
            var Target = await this.Server.Rcon.getClientByName(Client.Name)
            switch (true) {
              case !Client:
              case !Target:
                Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
              return;
            }
            await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Player.Clientslot}`)
            await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Target.Clientslot}`)
            Player.Tell(`Teleporting you to ${Target.Name}`)
          }
        },
        'tphere': {
          ArgumentLength: 1,
          Permission: Permissions.Commands.COMMAND_TP,
          callback: async (Player, args) => {
            var Client = await this.Server.DB.getClient(args[1])
            var Target = await this.Server.Rcon.getClientByName(Client.Name)
            switch (true) {
              case !Client:
              case !Target:
                Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
              return;
            }
            await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Target.Clientslot}`)
            await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Player.Clientslot}`)
            Player.Tell(`Teleporting ${Target.Name} to you`)
          }
        },
        'setrole': {
          ArgumentLength: 2,
          Permission: Permissions.Commands.COMMAND_SETROLE,
          callback: async (Player, args) => {
              var Role = args.slice(2).join(' ')
              var Client = await this.Server.DB.getClient(args[1]);

              var Target = (await this.Server.Rcon.getClientByName(Client.Name)) ? this.Server.Clients[(await this.Server.Rcon.getClientByName(Client.Name)).Clientslot] : null
              
              var Permission = this.getRoleFrom(Role, 0)
              switch (true) {
                case (!Client):
                  Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
                  return;
                case (!Permission):
                  Player.Tell(lookup.ROLE_NOT_EXIST)
                  return;
                case (Permission.Level > Player.PermissionLevel || Permission.Level >= Permissions.Levels.ROLE_OWNER):
                  Player.Tell(lookup.ROLE_HIERARCHY_ERROR)
                  return;
                case (Player.ClientId == Client.ClientId):
                  Player.Tell(lookup.ROLE_SELF_ERROR)
                  return;
              }
              this.Server.DB.setLevel(Client, Permission.Level)
              Player.Tell(`^5${Client.Name}^7's role has been set to [ ^5${Permission.Name}^7 ]`)
              Target && Target.Tell(`Your role has been set to [ ^5${Permission.Name}^7 ]`)
          }
        },
        'owner': {
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: async (Player) => {
            var Owner = await this.Server.DB.getOwner()
            console.log(Owner)
            switch (true) {
              case !Owner:
                this.Server.DB.setLevel(Player, 5)
                Player.Tell(`Your role has been set to [ ^5${this.getRoleFrom(5, 1).Name}^7 ]`)
                return
              case (Owner.ClientId == Player.ClientId):
                Player.Tell(`You're already the owner!`)
                return;
              case (Owner.ClientId != Player.ClientId):
                Player.Tell(`${this.Server.DB.getClient(Owner.ClientId).Name} owns this server`)
                return;
            }
          }
        },
        'kick': {
          ArgumentLength: 2,
          Alias: 'k',
          Permission: Permissions.Commands.COMMAND_KICK,
          callback: async (Player, args) => {
            var Client = await this.Server.DB.getClient(args[1])

            switch (true) {
              case (Client.Permission >= Player.PermissionLevel):
                Player.Tell(lookup.CLIENT_HIERARCHY_ERROR)
              return
            }
              for (var i = 0; i < this.Server.Clients.length; i++) {
                if (this.Server.Clients[i] && this.Server.Clients[i].Guid == Client.Guid) {
                  this.Server.Clients[i].Kick(`You have been kicked: ^5${args.slice(2).join(' ')}`, Player.ClientId)
                  return;
                }
              }
              Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
          }
        },
        'unban': {
          ArgumentLength: 2,
          Alias: 'ub',
          Permission: Permissions.Commands.COMMAND_KICK,
          callback: async (Player, args) => {
            var Client = await this.Server.DB.getClient(args[1])
            var Reason = args.slice(2).join(' ')

            switch (true) {
              case (Client.Permission >= Player.PermissionLevel):
                Player.Tell(lookup.CLIENT_HIERARCHY_ERROR)
              return
            }

            var count = await this.Server.DB.unbanClient(Client.ClientId, Reason, Player.ClientId)

            count > 0 ? Player.Tell(`Unbanned ^5${Client.Name}^7 for ^5${Reason}^7`) : Player.Tell(`^5${Client.Name}^7 is not banned`)
          }
        },
        'tempban': {
          ArgumentLength: 3,
          Alias: 'tb',
          Permission: Permissions.Commands.COMMAND_BAN,
          callback: async (Player, args) => {

            var timeVars = {
              'd': 86400,
              'h': 3600,
              'm': 60,
              's': 1,
            }

            var Client = await this.Server.DB.getClient(args[1])

            var parts = Array.from(args[2].match(/([0-9]+)([A-Za-z]+)/)).slice(1)

            switch (true) {
              case (Client.Permission >= Player.PermissionLevel):
                Player.Tell(lookup.CLIENT_HIERARCHY_ERROR)
              return
              case (!parts || parts.length < 2 || !timeVars[parts[1]] || !Number.isInteger(parseInt(parts[0]))):
                Player.Tell(lookup.COMMAND_PARSE_TIME_ERROR)
              return
            }

            var Reason = args.slice(3).join(' ')
            var Duration = parseInt(parts[0] * timeVars[parts[1]])

            for (var i = 0; i < this.Server.Clients.length; i++) {
              if (this.Server.Clients[i] && this.Server.Clients[i].Guid == Client.Guid) {
                this.Server.Clients[i].Tempban(Reason, Player.ClientId, Duration)
                Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
                return;
              }
            }

            switch (true) {
              case (!Client):
                Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
                return
            }

            this.Server.DB.addPenalty({
              TargetId: args[1],
              OriginId: Player.ClientId,
              PenaltyType: 'PENALTY_TEMP_BAN',
              Duration: Duration,
              Reason: Reason
            })
            Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
          }
        },
        'ban': {
          ArgumentLength: 2,
          Alias: 'b',
          Permission: Permissions.Commands.COMMAND_BAN,
          callback: async (Player, args) => {
            var Client = await this.Server.DB.getClient(args[1])

            switch (true) {
              case (Client.Permission >= Player.PermissionLevel):
                Player.Tell(lookup.CLIENT_HIERARCHY_ERROR)
              return
            }

            var Reason = args.slice(2).join(' ')

            for (var i = 0; i < this.Server.Clients.length; i++) {
              if (this.Server.Clients[i] && this.Server.Clients[i].Guid == Client.Guid) {
                this.Server.Clients[i].Ban(Reason, Player.ClientId)
                Player.Tell(`Banned ${Client.Name} permanently for ${Reason}`)
                return;
              }
            }

            switch (true) {
              case (!Client):
                Player.Tell(lookup.COMMAND_CLIENT_NOT_FOUND)
                return
            }

            this.Server.DB.addPenalty({
              TargetId: args[1],
              OriginId: Player.ClientId,
              PenaltyType: 'PENALTY_PERMA_BAN',
              Duration: 0,
              Reason: Reason
            })

            Player.Tell(`Banned ${Client.Name} permanently for ${Reason}`)
          }
        },
        'find': {
          ArgumentLength: 1,
          Alias: 'f',
          Permission: Permissions.Commands.COMMAND_USER_CMDS,
          callback: async (Player, args) => {
             var MatchedClients = await this.Server.DB.getClientByName(args.slice(1).join(' '))
             if (MatchedClients.length <= 0) {Player.Tell(`Client not found`); return}
             var i = 0, interval = setInterval(() => {
              Player.Tell(`^5${MatchedClients[i].Name} ^7| ^5@${MatchedClients[i].ClientId} ^7| ^5${this.getRoleFrom(MatchedClients[i].PermissionLevel, 1).Name} ^7| Active ${moment(MatchedClients[i].LastConnection).calendar()} | Joined ${moment(MatchedClients[i].FirstConnection).calendar()}`)
              i++; if (i >= MatchedClients.length) clearInterval(interval)
             }, 300)
          }
        }
      };
      args[0] = args[0].toLocaleLowerCase()
      switch (true) {
        case (!commands[args[0]]):
          Player.Tell(lookup.COMMAND_NOT_FOUND)
          return;
        case (Player.PermissionLevel < Permissions.Levels[commands[args[0]].Permission]):
          Player.Tell(lookup.COMMAND_FORBIDDEN)
          return;
        case (args.length - 1 < commands[args[0]].ArgumentLength):
          Player.Tell(lookup.COMMAND_ARGUMENT_ERROR)
          return;
      }
      commands[args[0]].callback(Player, args)
  }
  timeConvert (n) {
    var num = n;
    var hours = (num / 60);
    var rhours = Math.floor(hours);
    var minutes = (hours - rhours) * 60;
    var rminutes = Math.round(minutes);
    return `${rhours}:${rminutes}`
  }
}
module.exports = Plugin