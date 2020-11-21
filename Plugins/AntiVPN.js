const Localization = JSON.parse(process.env.Localization).lookup
const fetch        = require('node-fetch')

class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.Server.on('connect', this.onPlayerConnected.bind(this))
    }
    async onPlayerConnected(Player) {
        try {
            if (!Player.IPAddress) {
                return
            }
    
            var result = (await (await fetch(`https://api.xdefcon.com/proxy/check/?ip=${Player.IPAddress.split(':')[0]}`)).json())
    
            if (result.proxy) {
                Player.Kick(Localization['PENALTY_VPN_KICK'])
            }
        }
        catch (e) {}
    }

}
module.exports = Plugin