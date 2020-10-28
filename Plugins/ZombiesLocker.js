const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const { Command }       = require(path.join(__dirname, `../Lib/Classes.js`))

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('preconnect', this.onPlayerConnect.bind(this))
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.Server.on('line', this.onLine.bind(this))
        this.Server.on('dvars_loaded', this.init.bind(this))
    }
    async onLine(line) {
        line = line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')
        if (Utils.isJson(line)) {
            var lockerEvent = JSON.parse(line)
            switch (lockerEvent.event) {
                case 'locker_set':
                    var found = this.Server.Clients.find(c => c.Guid == lockerEvent.player.Guid)
                    var Client = found ? found : this.Server.DB.getClientByGuid(lockerEvent.player.Guid)
                    if (!Client) return

                    if (!lockerEvent.weapondata) {
                        this.Server.DB.metaService.addPersistentMeta('weapondata', "undefined", Client.ClientId)
                        found && Client.Tell(Localization['LOCKER_WEAPON_SAVED'])
                        return
                    }

                    this.Server.DB.metaService.addPersistentMeta('weapondata', JSON.stringify(lockerEvent.weapondata), Client.ClientId)
                    found && Client.Tell(Localization['LOCKER_WEAPON_SAVED'])
                break
            }
        }
    }
    async onPlayerConnect(Player) {
        var weaponData = await this.Server.DB.metaService.getPersistentMeta('weapondata', Player.ClientId)
        var dvarValue = 'undefined'

        if (!weaponData || !Utils.isJson(weaponData.Value)) {
            this.Server.Rcon.setDvar(`${Player.Guid}_weapondata`, dvarValue)
            return
        }

        this.Server.Rcon.setDvar(`${Player.Guid}_weapondata`, Object.values(JSON.parse(weaponData.Value)).toString())
    }
    async init () {
        var lockerCmd = new Command()
        .setName('locker')
        .addCallback(async (Player) => {
            try {
                var weaponData = await this.Server.DB.metaService.getPersistentMeta('weapondata', Player.ClientId)

                if (!weaponData || weaponData.Value == 'undefined') {
                    Player.Tell(Localization['COMMAND_LOCKER_EMPTY'])
                    return
                }
                
                weaponData = JSON.parse(weaponData.Value)
    
                Player.Tell(Utils.formatString(Localization['COMMAND_LOCKER_FORMAT'], { weaponName: weaponData.name, clip: weaponData.clip, stock: weaponData.stock }, '%'))
            }
            catch (e) {console.log(e)} 
        })
        if (this.Server.Gametype == 'zclassic')
            this.Manager.Commands.add(lockerCmd)
    }
}
module.exports = Plugin