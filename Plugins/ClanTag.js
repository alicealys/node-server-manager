const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.lockerCost = 100000
        this.defaultLockerSize = 1
        this.Server.on('preconnect', this.onPlayerConnect.bind(this))
        this.Server.on('connect', this.onPlayerConnect.bind(this))
    }

    async onPlayerConnect(Player) {
        var role = Utils.getRoleFrom(Player.PermissionLevel, 1).Name
        this.Server.Rcon.executeCommandAsync(`setclantag ${Player.Clientslot} ${Utils.stripString(role)}`)
    }
}

module.exports = Plugin