const path                              = require('path')
const { Command, NodeServerManager }    = require(path.join(__dirname, `../Lib/Classes.js`))
const Utils                             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions                       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Localization                       = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup

class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.Server.on('any_event', this.onEvent.bind(this))
        this.Server.on('connected', this.onPlayerConnected.bind(this))
    }
    async onPlayerConnected(Player) {
        if (this.Server.getClients().length - this.Server.getPriviledgedClients().length + this.Server.reservedSlots > this.Server.MaxClients && Player.PermissionLevel < Permissions.Levels['ROLE_MODERATOR']) {
            Player.Kick(Localization['KICK_CLIENTSLOT_RESERVED'])
        }
    }
    async onEvent (Event) {
        try {
            var playerPenalties = await this.Server.DB.getAllPenalties(Event.Origin.ClientId)

            for (var i = 0; i < playerPenalties.length; i++) {
                switch (playerPenalties[i].PenaltyType) {
                    case 'PENALTY_PERMA_BAN':
                        playerPenalties[i].Active && Event.Origin.Kick(`Banned for: ^5${playerPenalties[i].Reason}`, NodeServerManager)
                    break
                    case 'PENALTY_TEMP_BAN':
                        var dateDiff = (new Date(playerPenalties[i].Date) - new Date()) / 1000
                        if (dateDiff + playerPenalties[i].Duration > 0) {
                            playerPenalties[i].Active && Event.Origin.Kick(`Banned for: ^5${playerPenalties[i].Reason}^7 ${Utils.secondsToDhms(dateDiff + playerPenalties[i].Duration)} left`, NodeServerManager)
                        }
                    break
                }
            }
        }
        catch (e) {}
    }

}
module.exports = Plugin