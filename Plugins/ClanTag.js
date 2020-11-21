const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const { Command }       = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization      = require(path.join(__dirname, `../Configuration/Localization-en.json`)).lookup

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.lockerCost = 100000
        this.defaultLockerSize = 1
        this.Server.on('preconnect', this.onPlayerConnect.bind(this))
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.init()
    }
    async init() {
        (() => {
            let command = new Command()
            .setName('settag')
            .setAlias('st')
            .setPermission('ROLE_MODERATOR')
            .addParams([
                {
                    name: 'target',
                    index: 1,
                    join: true
                },
                {
                    name: 'tag',
                    index: 0
                }
            ])
            .addCallback(async (Player, params) => {
                var Client = await this.Server.getClient(params.target)

                if (!Client) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                this.Server.DB.metaService.addPersistentMeta('custom_tag', params.tag, Client.ClientId)
                var inGame = this.Server.findClient(Client.ClientId)

                if (inGame) {
                    inGame.Server.Rcon.executeCommandAsync(`setclantagraw ${inGame.Clientslot} "${params.tag}"`)

                    inGame.Tell(Utils.va(Localization['COMMAND_SETTAG_FORMAT_SELF'], params.tag))
                }

                Player.Tell(Utils.va(Localization['COMMAND_SETTAG_FORMAT'], inGame.Name, params.tag))
            })

            this.Manager.Commands.add(command)
        })(this);
        
        (() => {
            let command = new Command()
            .setName('deltag')
            .setAlias('dt')
            .setPermission('ROLE_MODERATOR')
            .addParams([
                {
                    name: 'target',
                    index: 0,
                    join: true
                }
            ])
            .addCallback(async (Player, params) => {
                var Client = await this.Server.getClient(params.target)

                if (!Client) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                this.Server.DB.metaService.deletePersistentMeta('custom_tag', Client.ClientId)
                var inGame = this.Server.findClient(Client.ClientId)

                if (inGame) {
                    var role = Utils.stripString(Utils.getRoleFrom(Player.PermissionLevel, 1).Name)

                    inGame.Server.Rcon.executeCommandAsync(`setclantagraw ${inGame.Clientslot} "${role}"`)
                    inGame.Tell(Localization['COMMAND_DELTAG_SELF'])
                }

                Player.Tell(Utils.va(Localization['COMMAND_DELTAG_FORMAT'], inGame.Name))
            })

            this.Manager.Commands.add(command)
        })(this);
    }
    async onPlayerConnect(Player) {
        var role = Utils.getRoleFrom(Player.PermissionLevel, 1).Name

        var customTag = await this.Server.DB.metaService.getPersistentMeta('custom_tag', Player.ClientId)
        role = customTag ? customTag.Value : Utils.stripString(role)

        this.Server.Rcon.executeCommandAsync(`setclantagraw ${Player.Clientslot} "${role}"`)
    }
}

module.exports = Plugin