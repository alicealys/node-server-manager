const path              = require('path')
const fetch             = require('node-fetch')
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils()

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.joinMessages()
    }
    async joinMessages() {
        var lookup = {
            'WELCOME_PLAYER': 'Welcome ^5%PLAYER%^7, this is the ^5%CONNECTIONS%^7 time you\'ve visited this server!',
            'WELCOME_PLAYER_BROADCAST': '^%LEVEL%%ROLE%^7 ^5%PLAYER%^7 joined from ^5%LOCATION%^7'
        }

        this.Server.on('connect', async (Player) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV.toLocaleLowerCase() == 'dev') return
            var connections = await this.Server.DB.getAllConnections(Player.ClientId)
            Player.Tell(lookup.WELCOME_PLAYER
                        .replace('%PLAYER%', Player.Name)
                        .replace('%CONNECTIONS%', this.ordinalSuffix(connections.length)))
            if (Player.Session.Data.Authorized) {
                Player.Tell('Logged in through previous session')
            }
            if (Player.IPAddress) {
                var info = await this.getInfo(Player.IPAddress)
                this.Server.Broadcast(lookup.WELCOME_PLAYER_BROADCAST
                                      .replace('%PLAYER%', Player.Name)
                                      .replace('%LOCATION%', info.country)
                                      .replace('%LEVEL%', Player.PermissionLevel)
                                      .replace('%ROLE%', Utils.getRoleFrom(Player.PermissionLevel, 1).Name))
            }
        })
    }

    async getInfo(IPAddress) {
        return (await (await fetch(`https://extreme-ip-lookup.com/json/${IPAddress.split(':')[0]}`)).json())
    }

    ordinalSuffix(i) {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return i + "st";
        }
        if (j == 2 && k != 12) {
            return i + "nd";
        }
        if (j == 3 && k != 13) {
            return i + "rd";
        }
        return i + "th";
    }
}
module.exports = Plugin