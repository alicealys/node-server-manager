const path              = require('path')
const fetch             = require('node-fetch')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

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
            if (Player.IPAddress.match(/(unknown|loopback|bot)/g)) return

            Player.IPAddress = Player.IPAddress ? Player.IPAddress : (await this.Server.DB.getClient(Player.ClientId)).IPAddress

            if (Player.PermissionLevel >= Permissions.Levels['ROLE_MODERATOR']) {
                Player.Tell(Utils.formatString(Localization['AUTO_RECENT_REPORTS'], { count: (await this.Server.DB.getActiveReports()).length }, '%')[0])
            }

            if (process.env.NODE_ENV && process.env.NODE_ENV.toLocaleLowerCase() == 'dev') return

            var connections = await this.Server.DB.getAllConnections(Player.ClientId)

            Player.Tell(Localization['WELCOME_PLAYER']
                        .replace('%PLAYER%', Player.Name)
                        .replace('%CONNECTIONS%', Utils.ordinalSuffix(connections.length | 1)))

            if (Player.Session.Data.Authorized) {
                Player.Tell('Logged in through previous session')
            }

            var setting = await this.Server.DB.metaService.getPersistentMeta('location', Player.ClientId)
            if (Player.IPAddress) {
                var info = !(setting && setting.Value == '1') 
                    ? await this.getInfo(Player.IPAddress.match(/(localhost|127\.0\.0\.1)/g) 
                        ? this.Server.externalIP 
                        : Player.IPAddress) 
                    : { country: Localization['STRING_HIDDEN'] }

                this.Server.Broadcast(Utils.formatString(Localization['WELCOME_PLAYER_BROADCAST'], {
                    player: Player.Name,
                    location: info ? info.country : Localization['STRING_UNKNOWN'],
                    level: Player.PermissionLevel,
                    role: Utils.getRoleFrom(Player.PermissionLevel, 1).Name
                }, '%')[0])
            }
        })
    }
    async getInfo(IPAddress) {
        var result = await fetch(`https://extreme-ip-lookup.com/json/${IPAddress.split(':')[0]}`)
        if (result) {
            return await result.json()
        }
        return false
    }
}

module.exports = Plugin