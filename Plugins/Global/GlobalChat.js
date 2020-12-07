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
        if (Player.Session && Player.Session.Data.serverChat) {
            Player.Session.Data.serverChat.Broadcast(Utils.formatString(Localization['GLOBALCHAT_FORMAT'], {
                Enabled: '',
                Name: Player.Name,
                Message,
                Hostname: Player.Hostname
            }))
        }

        this.Managers.forEach(async Manager => {
            Manager.Server.Clients.forEach(Client => {
                if (!Client || !Client.Session) return

                if (Client.Session.Data.serverChat 
                    && Client.Session.Data.serverChat.Id == Player.Server.Id 
                    && (!Player.Session.Data.serverChat || Player.Session.Data.serverChat && Player.Session.Data.serverChat.Id != Client.Server.Id)) {
                    Client.Tell(Utils.formatString(Localization['SOCKET_MSG_FORMAT'], {
                        Name: Player.Name, 
                        Message,
                    }, '%')[0])
                    return
                }

                if (!Client.Session.Data.globalChat 
                    || Client.Server.Id == Player.Server.Id) return

                Client.Tell(Utils.formatString(Localization['GLOBALCHAT_FORMAT'], {
                    Enabled: (Player.Session && Player.Session.Data.globalChat) ? '[^1G^7]' : '',
                    Name: Player.Name, 
                    Message, 
                    Hostname: Player.Server.HostnameRaw
                }, '%')[0])
            })
        })
    }
}

module.exports = Plugin