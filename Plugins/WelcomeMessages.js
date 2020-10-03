const path              = require('path')
const fetch             = require('node-fetch')
const Utils            = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization          = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.joinMessages()
    }
    async joinMessages() {
        this.Server.on('disconnect', async (Player) => {
            this.Server.Broadcast(Utils.formatString(Localization['QUIT_PLAYER_BROADCAST'], {Name: Player.Name}, '%')[0])
        })

        this.Server.on('penalty', async (Type, Target, Reason, Origin, Duration = -1) => {
            if (Origin == 1) return
            Duration = Duration > 0 ? Utils.time2str(Duration) : ''
            this.Server.globalBroadcast(Utils.formatString(Localization[`${Type}_MESSAGE`], {Name: Target.Name, Reason, Origin: Origin.Name, Duration}, '%')[0])
        })

        this.Server.on('connect', async (Player) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV.toLocaleLowerCase() == 'dev') return
            var connections = await this.Server.DB.getAllConnections(Player.ClientId)
            Player.Tell(Localization['WELCOME_PLAYER']
                        .replace('%PLAYER%', Player.Name)
                        .replace('%CONNECTIONS%', this.ordinalSuffix(connections.length)))
            if (Player.Session.Data.Authorized) {
                Player.Tell('Logged in through previous session')
            }
            if (Player.IPAddress) {
                var info = await this.getInfo(Player.IPAddress)
                this.Server.Broadcast(Localization['WELCOME_PLAYER_BROADCAST']
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