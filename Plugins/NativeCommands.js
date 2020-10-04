const moment            = require('moment')
const path              = require('path')
const crypto            = require('crypto')
const wait              = require('delay')
const fs                = require('fs')
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const configName        = path.join(__dirname, `../Configuration/NSMConfiguration.json`)
var config              = require(configName)
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Commands              = require(path.join(__dirname, `../Lib/Commands.js`))

fs.watch(configName, async (filename) => {
    if (filename) {
        try { var newData = require(configName) }
        catch (e) { 
            console.log(`Failed to reload config file ${configName}: ${e.toString()}`); return }

        config = newData
        console.log(`Reloaded config file ${configName}`)
    }
})

const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Utils            = new (require(path.join(__dirname, '../Utils/Utils.js')))()

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.init()
  }
  onEventAsync (event) {
    switch (event.type) {
        case 'say':
          if (config.commandPrefixes.includes(event.data.Message[0]) || config.broadcastCommandPrefixes.includes(event.data.Message[0])) this.playerCommand(event.data.Origin, event.data.Message.substr(1).split(/\s+/), event.data.Message[0])
        break;
    }
  }
  init () {
    this.Manager.commands = {
      'help': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var commandsArray = Object.entries(this.Manager.commands);
          if (!args[1]) {
            for (var i = 0; i < commandsArray.length; i++) {
              Player.Tell(`^7[^6${commandsArray[i][0]}^7] ${Localization[`COMMAND_${commandsArray[i][0].toLocaleUpperCase()}`]}`)
              delay && await wait(500)
            }
          } else {
            var command = Utils.getCommand(this.Manager.commands, args[1])
            if (!this.Manager.commands[command]) {
              Player.Tell(Localization['COMMAND_NOT_FOUND'])
              return
            }
            Player.Tell(`${Localization[`COMMAND_${command.toLocaleUpperCase()}`]}`)
            delay && await wait(300)
            Player.Tell(`Usage: ^6${config.commandPrefixes[0]}^7${Localization[`USAGE_${command.toLocaleUpperCase()}`]}`)
          }

        }
      },
      'fastrestart': {
        ArgumentLength: 0,
        Alias: 'fr',
        Permission: Permissions.Commands.COMMAND_MAP,
        inGame: true,
        callback: async (Player, args) => {
          await this.Server.Rcon.executeCommandAsync('fast_restart')
          this.Server.Broadcast(Utils.formatString(Localization['COMMAND_FASTRESTART_FORMAT'], {Name: Player.Name}, '%'))
        }
      },
      'maprestart': {
        ArgumentLength: 0,
        Alias: 'mr',
        Permission: Permissions.Commands.COMMAND_MAP,
        inGame: true,
        callback: async (Player, args) => {
          await this.Server.Rcon.executeCommandAsync('map_restart')
        }
      },
      'map': {
        ArgumentLength: 1,
        Alias: 'm',
        Permission: Permissions.Commands.COMMAND_MAP,
        inGame: true,
        callback: async (Player, args) => {
          var delay = 3000
          var Map = this.Server.getMap(args[1]) ? this.Server.getMap(args[1]) : {Name: args[1], Alias: args[1]}
          this.Server.Broadcast(Utils.formatString(Localization['COMMAND_MAP_FORMAT'], {Name: Map.Alias, Delay: (delay / 1000).toFixed(0)}, '%')[0])
          await wait(delay)
          await this.Server.Rcon.executeCommandAsync(`map ${Map.Name}`)
        }
      },
      'globalchat': {
        ArgumentLength: 0,
        Alias: 'gc',
        inGame: true,
        callback: async (Player) => {
          if (!Player.Session) return
          Player.Session.Data.globalChat = !Player.Session.Data.globalChat
          Player.Tell(Localization[`COMMAND_GLOBALCHAT_${Player.Session.Data.globalChat.toString().toLocaleUpperCase()}`])
        }
      },
      'nextmap': {
        ArgumentLength: 0,
        Alias: 'nm',
        inGame: true,
        callback: async (Player, args) => {
          var mapIndex = this.Server.mapRotation.indexOf(this.Server.mapRotation.find(Map => Map == this.Server.Mapname))
          if (!mapIndex) {
            Player.Tell(Localization['COMMAND_NEXTMAP_NOT_FOUND'])
            return
          }
          var nextMap = mapIndex < this.Server.mapRotation.length - 1 ? this.Server.mapRotation[mapIndex + 1] : this.Server.mapRotation[0]
          nextMap = this.Server.getMap(nextMap) ? this.Server.getMap(nextMap).Alias : nextMap
          Player.Tell(Utils.formatString(Localization['COMMAND_NEXTMAP_FORMAT'], {Name: nextMap}, '%'))
        }
      },
      'links': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args) => {
          if (!config.links || !config.links.length) {
            Player.Tell(Localization['COMMAND_LINKS_NOT_CONFIG'])
          }
          if (args[1]) {
            var found = false
            config.links.forEach(link => {
              if (found) return
              if (link.Name.toLocaleLowerCase().startsWith(args[1].toLocaleLowerCase())) {
                Player.Tell(Utils.formatString(Localization['COMMAND_LINKS_FORMAT'], link, '%')[0])
                found = true
              }
            })
            !found && Player.Tell(Localization['COMMAND_LINKS_NOT_FOUND'])
            return
          }
          for (var i = 0; i < config.links.length; i++) {
            Player.Tell(Utils.formatString(Localization['COMMAND_LINKS_FORMAT'], config.links[i], '%')[0])
            await wait(500)
          }
        }
      },
      'ping': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: function (Player) {
          Player.Tell('pong')
        }
      },
      'broadcast': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_BROADCAST,
        inGame: false,
        callback: async (Player, args) => {
          this.Managers.forEach(Manager => {
            Manager.Server.Broadcast(`^7[^1Broadcast ^7(^5${Player.Name}^7)] ${args.slice(1).join(' ')}`)
          })
        }
      },
      'tell': {
        ArgumentLength: 2,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var Client = await this.Server.getClient(args[1])
          switch (true) {
            case (!Client):
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return
          }
          var Target = this.findClient(Client.ClientId)
          switch (true) {
            case (!Target):
              Player.Tell(Localization.COMMAND_CLIENT_NOT_INGAME)
            return
          }

          Target.Session.Data.lastMsg = Player
          Player.Session.Data.lastMsg = Target
          Target.Tell(`^3[^5${Player.Name}^3 (@^5${Player.ClientId}^3) -> me]^7 ${args.slice(2).join(' ')}`)
          Player.Tell(`^3[me -> ^5${Target.Name} ^3(@^5${Target.ClientId}^3)^3]^7 ${args.slice(2).join(' ')}`)
        }
      },
      'reply': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        Alias: 'r',
        inGame: false,
        callback: async(Player, args) => {
          switch (true) {
            case (!Player.Session.Data.lastMsg):
              Player.Tell(Localization['COMMAND_REPLY_NOT_CONV'])
            return
            case (!this.findClient(Player.Session.Data.lastMsg.ClientId)):
              Player.Tell(Localization['COMMAND_CLIENT_NOT_INGAME'])
            return
          }

          Player.Session.Data.lastMsg.Tell(`^3[^5${Player.Name}^3 (@^5${Player.ClientId}^3) -> me]^7 ${args.slice(1).join(' ')}`)
          Player.Tell(`^3[me -> ^5${Player.Session.Data.lastMsg.Name} ^3(@^5${Player.Session.Data.lastMsg.ClientId}^3)^3]^7 ${args.slice(1).join(' ')}`)
        }
      },
      'players': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var Managers = this.Managers.concat()
          Player.Tell(`Player list:`)
          for (var j = 0; j < Managers.length; j++) {
            var Manager = Managers[j]
            var Clients = Utils.chunkArray(Manager.Server.Clients.filter((value) => {return value}), 4)
            for (var i = 0; i < Clients.length; i++) {
              var line = []
              for (var o = 0; o < Clients[i].length; o++) {
                line.push(`^7[^6${Utils.getRoleFrom(Clients[i][o].PermissionLevel, 1).Name}^7 (@^5${Clients[i][o].ClientId}^7)] ^5${Clients[i][o].Name}^7`)
              }
              Player.Tell(line.join(' '))
              delay && await wait(500)
            }
          }
        }
      },
      'info': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: (Player) => {
          Player.Tell(`Node Server Manager - v${this.Manager.Version} by ${this.Manager.Author}`)
        }
      },
      'whoami': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player) => {
          var info = await this.Server.DB.getClient(Player.ClientId)
          Player.Tell(`[^5${info.Name}^7]  [@^5${info.ClientId}^7]  [^5${Utils.getRoleFrom(Math.min(info.PermissionLevel, 5), 1).Name}^7] [^5${info.IPAddress}^7] [^5${info.Guid}^7]`)
        }
      },
      'whois': {
        ArgumentLength: 1,
        Permission: 'ROLE_ADMIN',
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])
          switch (true) {
            case (!Client):
              Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
            return
          }
          var info = await this.Server.DB.getClient(Client.ClientId)

          Player.Tell(`[^5${info.Name}^7]  [@^5${info.ClientId}^7]  [^5${Utils.getRoleFrom(Math.min(info.PermissionLevel, 5), 1).Name}^7] [^5${info.IPAddress}^7] ^7[^5${info.Guid}^7]`)
        }
      },
      'testperm': {
        ArgumentLength: 1,
        Permission: -10,
        inGame: false,
        callback: async (Player, args) => {
          var Permission = Utils.getRoleFrom(args.slice(1).join(' '), 0)
          var Client = await this.Server.DB.getClient(Player.ClientId)
          switch (true) {
            case (!Permission):
              Player.Tell(Localization.ROLE_NOT_EXIST)
            return
            case (Client.PermissionLevel < Permissions.Levels.ROLE_ADMIN):
              Player.Tell(Localization.COMMAND_FORBIDDEN)
            return
            case (Client.PermissionLevel < Permission.Level):
              Player.Tell(Localization.ROLE_HIERARCHY_ERROR)
            return
          }
          Player.PermissionLevel = Permission.Level
          Player.Tell(`Permissions set to [ ^5${Permission.Name}^7 ]`)
        }
      },
      'servers': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args, delay) => {
          var Managers = this.Managers.concat()
          if (args[1] && Managers[parseInt(args[1])] && Managers[parseInt(args[1])].Server.Mapname) {
            var Manager = Managers[parseInt(args[1])]
            Player.Tell(`[${Manager.Server.HostnameRaw}]^7 - ^3${Manager.Server.IP}:^5${Manager.Server.PORT}^7 - ^5${Manager.Server.Clients.filter((value) => {return value}).length}^7 players online on ^5${Manager.Server.Mapname}`)
            return
          }
          for (var i = 0; i < Managers.length; i++) {
            var Manager = Managers[i]
            if (!Manager.Server.Mapname) continue
            Player.Tell(`[^5${i}^7] - [${Manager.Server.HostnameRaw}]^7 - ^3${Manager.Server.IP}:^5${Manager.Server.PORT}^7 - ^5${Manager.Server.Clients.filter((value) => {return value}).length}^7 players online on ^5${Manager.Server.Mapname}`)
            delay && await wait(500)
          }
        }
      },
      'stats': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args) => {
          var Target = !args[1] ? Player : await this.Server.getClient(args[1])

          if (!Target) {
            Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return
          }
          var ClientId = Target.ClientId
          var Stats = await this.Server.DB.getPlayerStatsTotal(ClientId)
          var Client = await this.Server.DB.getClient(ClientId)
          if (Stats)
            Player.Tell(Localization.COMMAND_STATS_FORMAT
            .replace('%PLAYEDTIME%', Utils.time2str(Stats.PlayedTime * 60))
            .replace('%PERFORMANCE%', Stats.Performance.toFixed(2))
            .replace('%NAME%', Client.Name)
            .replace('%KILLS%', Stats.Kills)
            .replace('%DEATHS%', Stats.Deaths)
            .replace('%KDR%',(Stats.Kills / Math.max(Stats.Deaths, 1)).toFixed(2)))
          else Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
        }
      },
      'token': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player) => {
          var Client = await this.Server.DB.getClient(Player.ClientId)

          if (!Client.Settings.TokenLogin) {
            Player.Tell(Localization.TOKEN_LOGIN_DISABLED)
            return
          }

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
          Player.Tell(Localization.COMMAND_TOKEN_FORMAT
            .replace('%CLIENTID%', Player.ClientId)
            .replace('%TOKEN%', formattedToken.join('')))
          await this.Server.DB.createToken(Player.ClientId, rawToken.join(''))
        }
      },
      'rcon': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_RCON,
        inGame: false,
        callback: async (Player, args, delay) => {
          var result = []
          if (!Player.inGame) {
            switch (true) {
              case (args.length < 2):
                Player.Tell(Localization.RCON_SERVER_NOT_SPECIFIED)
              return
              case (!this.Managers[parseInt(args[1])] || !this.Managers[parseInt(args[1])].Server.Mapname || !this.Managers[parseInt(args[1])].Server.Rcon.isRunning):
                Player.Tell(Localization.SERVER_NOT_EXIST)
              return
            }
            result = (await this.Managers[parseInt(args[1])].Server.Rcon.executeCommandAsync(args.slice(2).join(' '))).trim().split('\n')
          } else {
            result = (await this.Server.Rcon.executeCommandAsync(args.slice(1).join(' '))).trim().split('\n')
          }
          result[0] = Localization.COMMAND_EXECUTE_SUCCESS
          for (var i = 0; i < result.length; i++) {
            Player.Tell(result[i])
            delay && await wait(300)
          }
        }
      },
      'tp': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_TP,
        inGame: true,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])
          var Target = await this.Server.Rcon.getClientByGuid(Client.Guid)
          switch (true) {
            case !Client:
            case !Target:
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return;
          }
          await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Player.Clientslot}`)
          await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Target.num}`)
          Player.Tell(`Teleporting you to ${Target.name}`)
        }
      },
      'tphere': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_TP,
        inGame: true,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])
          var Target = await this.Server.Rcon.getClientByGuid(Client.Guid)
          switch (true) {
            case !Client:
            case !Target:
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return;
          }
          await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Target.num}`)
          await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Player.Clientslot}`)
          Player.Tell(`Teleporting ${Target.name} to you`)
        }
      },
      'setrole': {
        ArgumentLength: 2,
        Permission: Permissions.Commands.COMMAND_SETROLE,
        inGame: false,
        Alias: 'sr',
        callback: async (Player, args) => {
            var Role = args.slice(2).join(' ')
            var Client = await this.Server.getClient(args[1])
            
            var Permission = Utils.getRoleFrom(Role, 0)
            switch (true) {
              case (!Client):
                Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
                return;
              case (!Permission):
                Player.Tell(Localization.ROLE_NOT_EXIST)
                return;
              case (Permission.Level > Player.PermissionLevel || Permission.Level >= Permissions.Levels.ROLE_OWNER):
                Player.Tell(Localization.ROLE_HIERARCHY_ERROR)
                return;
              case (Player.ClientId == Client.ClientId):
                Player.Tell(Localization.ROLE_SELF_ERROR)
                return;
            }
            var Target = this.findClient(Client.ClientId)
            if (Target) {
              Target.PermissionLevel = Permission.Level
              Target.Tell(`Your role has been set to [ ^5${Permission.Name}^7 ]`)
            }
            this.Server.DB.setLevel(Client, Permission.Level)
            Player.Tell(`^5${Client.Name}^7's role has been set to [ ^5${Permission.Name}^7 ]`)
        }
      },
      'owner': {
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: true,
        callback: async (Player) => {
          var Owner = await this.Server.DB.getOwner()
          switch (true) {
            case !Owner:
              this.Server.DB.setLevel(Player, 5)
              Player.Tell(`Your role has been set to [ ^5${Utils.getRoleFrom(5, 1).Name}^7 ]`)
              return
            case (Owner.ClientId == Player.ClientId):
              Player.Tell(`You're already the owner!`)
              return;
            case (Owner.ClientId != Player.ClientId):
              Player.Tell(`^5${(await this.Server.DB.getClient(Owner.ClientId)).Name}^7 owns this server`)
              return;
          }
        }
      },
      'kick': {
        ArgumentLength: 2,
        Alias: 'k',
        Permission: Permissions.Commands.COMMAND_KICK,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])

          switch (true) {
            case (!Client):
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return
            case (Client.PermissionLevel >= Player.PermissionLevel):
              Player.Tell(Localization.CLIENT_HIERARCHY_ERROR)
            return
          }
          var Target = this.findClient(Client.ClientId)
          Target ? ( Player.Tell(`^5${Target.Name}^7 was kicked`), Target.Kick(`${args.slice(2).join(' ')}`, Player)) : Player.Tell(Localization.COMMAND_CLIENT_NOT_INGAME)
        }
      },
      'unban': {
        ArgumentLength: 2,
        Alias: 'ub',
        Permission: Permissions.Commands.COMMAND_KICK,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])
          var Reason = args.slice(2).join(' ')

          switch (true) {
            case (Client.PermissionLevel >= Player.PermissionLevel):
              Player.Tell(Localization.CLIENT_HIERARCHY_ERROR)
            return
          }

          var count = await this.Server.DB.unbanClient(Client.ClientId, Reason, Player.ClientId)

          this.Server.DB.addPenalty({
            TargetId: Client.ClientId,
            OriginId: Player.ClientId,
            PenaltyType: 'PENALTY_UNBAN',
            Active: false,
            Duration: 0,
            Reason: Reason
          })

          if (count) {
            Player.Tell(`Unbanned ^5${Client.Name}^7 for ^5${Reason}^7`)
            this.Server.emit('penalty', 'PENALTY_UNBAN', Client, Reason, Player)
          } else 
            Player.Tell(`^5${Client.Name}^7 is not banned`)
        }
      },
      'tempban': {
        ArgumentLength: 3,
        Alias: 'tb',
        Permission: Permissions.Commands.COMMAND_BAN,
        inGame: false,
        callback: async (Player, args) => {

          var timeVars = {
            'd': 86400,
            'h': 3600,
            'm': 60,
            's': 1,
          }

          var Client = await this.Server.getClient(args[1])

          var parts = Array.from(args[2].match(/([0-9]+)([A-Za-z]+)/)).slice(1)

          switch (true) {
            case (!Client):
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            return
            case (Client.PermissionLevel >= Player.PermissionLevel):
              Player.Tell(Localization.CLIENT_HIERARCHY_ERROR)
            return
            case (!parts || parts.length < 2 || !timeVars[parts[1]] || !Number.isInteger(parseInt(parts[0]))):
              Player.Tell(Localization.COMMAND_PARSE_TIME_ERROR)
            return
          }

          var Reason = args.slice(3).join(' ')
          var Duration = parseInt(parts[0] * timeVars[parts[1]])
          var Target = this.findClient(Client.ClientId)
          if (Target) {
            Target.Tempban(Reason, Player, Duration)
            Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
            return
          }


          this.Server.DB.addPenalty({
            TargetId: Client.ClientId,
            OriginId: Player.ClientId,
            PenaltyType: 'PENALTY_TEMP_BAN',
            Duration: Duration,
            Reason: Reason
          })

          this.Server.emit('penalty', 'PENALTY_TEMP_BAN', Client, Reason, Player, Duration)
          Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
        }
      },
      'ban': {
        ArgumentLength: 2,
        Alias: 'b',
        Permission: Permissions.Commands.COMMAND_BAN,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.getClient(args[1])

          switch (true) {
            case (!Client):
              Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
              return
            case (Client.PermissionLevel >= Player.PermissionLevel):
              Player.Tell(Localization.CLIENT_HIERARCHY_ERROR)
            return
          }

          var Reason = args.slice(2).join(' ')

          var Target = this.findClient(Client.ClientId)
          if (Target) {
            Target.Ban(Reason, Player)
            Player.Tell(`Banned ${Target.Name} permanently for ${Reason}`)
            return
          }

          this.Server.DB.addPenalty({
            TargetId: Client.ClientId,
            OriginId: Player.ClientId,
            PenaltyType: 'PENALTY_PERMA_BAN',
            Duration: 0,
            Reason: Reason
          })

          this.Server.emit('penalty', 'PENALTY_PERMA_BAN', Client, Reason, Player)
          Player.Tell(`Banned ${Client.Name} permanently for ${Reason}`)
        }
      },
      'find': {
        ArgumentLength: 1,
        Alias: 'f',
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args, delay) => {
           var MatchedClients = await this.Server.DB.getClientByName(args.slice(1).join(' '))
           if (MatchedClients.length <= 0) {Player.Tell(`Client not found`); return}
           for (var i = 0; i < Math.min(MatchedClients.length, 10); i++) {
            Player.Tell(`^5${MatchedClients[i].Name} ^7| ^5@${MatchedClients[i].ClientId} ^7| ^5${Utils.getRoleFrom(MatchedClients[i].PermissionLevel, 1).Name} ^7| Active ${moment(MatchedClients[i].LastConnection).calendar()} | Joined ${moment(MatchedClients[i].FirstConnection).calendar()}`)
            delay && await wait(300)
           }
        }
      }
    };
      this.Server.on('event', this.onEventAsync.bind(this));
  }
  findClient(ClientId) {
    var Client = null
    this.Managers.forEach(Manager => {
      if (Client) return
      Client = Manager.Server.Clients.find(x => x && x.ClientId == ClientId)
    })
    return Client
  } 
  async playerCommand (Player, args, prefix) {
    if (!Player) return

    var isBroadcast = config.broadcastCommandPrefixes.includes(prefix)

    var executedMiddleware = await this.Manager.Commands.executeMiddleware(args[0], Player, args, { Broadcast: isBroadcast })

    if (this.Manager.Commands.Execute(args[0], Player, args, { Broadcast: isBroadcast } )) return

    var Client = await this.Server.DB.getClient(Player.ClientId)
    var command = Utils.getCommand(this.Manager.commands, args[0])
    switch (true) {
        case (!this.Manager.commands[command]):
        case (this.Manager.commands[command].gameTypeExclusions && this.Manager.commands[command].gameTypeExclusions.includes(this.Server.Gametype)):
            !executedMiddleware && Player.Tell(Localization.COMMAND_NOT_FOUND)
        return
        case (Client.Settings.InGameLogin && !Player.Session.Data.Authorized):
            Player.Tell(Localization.CLIENT_NOT_AUTHORIZED)
        return
        case (Player.PermissionLevel < Permissions.Levels[this.Manager.commands[command].Permission]):
            Player.Tell(Localization.COMMAND_FORBIDDEN)
        return
        case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
            Player.Tell(Localization.COMMAND_ARGUMENT_ERROR)
            await wait(300)
            Player.Tell(`Usage: ^6${config.commandPrefixes[0]}^7${Localization[`USAGE_${command.toLocaleUpperCase()}`]}`)
        return
    }
    this.Manager.commands[command].logToAudit != false && this.Server.DB.logActivity(`@${Player.ClientId}`, Localization['AUDIT_CMD_EXEC'].replace('%NAME%', command), args.join(' '))
    this.Manager.commands[command].callback(Player, args, true)
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