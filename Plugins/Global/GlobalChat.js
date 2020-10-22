const path              = require('path')
const Localization      = require(path.join(__dirname, `../../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Utils             = new (require(path.join(__dirname, '../../Utils/Utils.js')))()

class Plugin {
    constructor(Managers) {
        this.Managers = Managers
        this.init()
    }
    init() {
        this.Managers.forEach(Manager => {
            Manager.Server.on('message', this.playerMessage.bind(this))
        })
    }
    playerMessage(Player, Message) {
        this.Managers.forEach(async Manager => {
            Manager.Server.Clients.forEach(Client => {
                if (!Client || !Client.Session || !Client.Session.Data.globalChat || Client.Server.Id == Player.Server.Id) return
                Client.Tell(Utils.formatString(Localization['GLOBALCHAT_FORMAT'], {Enabled: (Player.Session && Player.Session.Data.globalChat) ? '[^1G^7]' : '',Name: Player.Name, Message, Hostname: Player.Server.HostnameRaw}, '%')[0])
            })
        })
    }
}

module.exports = Plugin