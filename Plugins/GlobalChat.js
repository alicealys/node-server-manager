const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Utils            = new (require(path.join(__dirname, '../Utils/Utils.js')))()

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('message', this.playerMessage.bind(this))
    }
    playerMessage(Player, Message) {
        this.Managers.forEach(Manager => {
            Manager.Server.Clients.forEach(Client => {
                if (!Client || !Client.Session.Data.globalChat || Client.Server.Id == Player.Server.Id) return
                Client.Tell(Utils.formatString(Localization['GLOBALCHAT_FORMAT'], {Name: Player.Name, Message, Hostname: Player.Server.HostnameRaw}, '%')[0])
            })
        })
    }
}

module.exports = Plugin