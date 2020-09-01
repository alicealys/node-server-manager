const path              = require('path')
const fetch             = require('node-fetch')
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils()
const config = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.autoMessages()
        this.joinMessages()
    }
    async joinMessages() {
        var lookup = {
            'WELCOME_PLAYER': 'Welcome ^5%PLAYER%^7, this is the ^5%CONNECTIONS%^7 time you\'ve visited this server!',
            'WELCOME_PLAYER_BROADCAST': '^%LEVEL%%ROLE%^7 ^5%PLAYER%^7 joined from ^5%LOCATION%^7'
        }

        this.Server.on('connect', async (Player) => {
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
    autoMessages() {
        setInterval(async () => {
            var index = Utils.getRandomInt(0, config.autoMessages.length)
            this.Server.Broadcast(await this.replacePlaceholders(config.autoMessages[index]))
        }, config.autoMessagesInterval * 1000);
    }
    async replacePlaceholders(text) {
        var placeholders = {
            'TOTALCLIENTS' : {
                async get() {
                    return (await placeholders.Server.DB.getAllClients()).length
                }
            },
            'PLAYERCOUNT': {
                async get() {
                    var count = 0;
                    var Managers = placeholders.Managers.concat()
                    Managers.forEach(Manager => {
                        count += Manager.Server.Clients.filter((x) => { return x }).length
                    })
                    return count
                }
            },
            'SERVERCOUNT': {
                async get() {
                    var Managers = placeholders.Managers.concat()
                    return Managers.filter((Manager) => { return Manager.Server.Mapname} ).length
                }
            },
            'TOTALKILLS': {
                async get() {
                    return (await placeholders.Server.DB.getGlobalStats()).totalKills
                }
            },
            'TOTALPLAYEDTIME': {
                async get() {
                    return parseInt(((await placeholders.Server.DB.getGlobalStats()).totalPlayedTime) / 60)
                }
            }
        }
        placeholders.Manager = this.Manager
        placeholders.Server = this.Server
        placeholders.Managers = this.Managers
        var entries = Object.entries(placeholders)

        for (var i = 0; i < entries.length; i++) {
            if (entries[i][0].match(/(Manager)|(Managers)|(Server)/g)) continue
            var value = await entries[i][1].get()
            text = text.replace(new RegExp(`{${entries[i][0]}}`, 'g'), value)
        }

        return text
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