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
        this.Server.on('disconnect', this.onPlayerDisconnect.bind(this))
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
                    index: 0,
                },
                {
                    name: 'tag',
                    join: true,
                    index: 1
                }
            ])
            .addCallback(async (Player, params) => {
                var Client = await this.Server.getClient(params.target)
                
                switch (true) {
                    case (!Client):
                        Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                        return
                    case (Client.ClientId != Player.ClientId && Client.PermissionLevel >= Player.PermissionLevel):
                        Player.Tell(Localization['CLIENT_HIERARCHY_ERROR'])
                        return
                }

                this.Server.DB.metaService.addPersistentMeta('custom_tag', params.tag, Client.ClientId)
                var inGame = this.Server.findClient(Client.ClientId)

                if (inGame) {
                    inGame.Server.Rcon.executeCommandAsync(`setclantagraw ${inGame.Clientslot} "${params.tag}"`)
                    inGame.Tell(Utils.va(Localization['COMMAND_SETTAG_FORMAT_SELF'], params.tag))
                }

                (Player.ClientId != Client.ClientId || !inGame) && Player.Tell(Utils.va(Localization['COMMAND_SETTAG_FORMAT'], Client.Name, params.tag))
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
                    var role = Utils.stripString(Utils.getRoleFrom(Client.PermissionLevel, 1).Name)

                    inGame.Server.Rcon.executeCommandAsync(`setclantagraw ${inGame.Clientslot} "${role}"`)
                    inGame.Tell(Localization['COMMAND_DELTAG_SELF'])
                }

                Player.Tell(Utils.va(Localization['COMMAND_DELTAG_FORMAT'], inGame.Name))
            })

            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('censorname')
            .setAlias('cn')
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

                var inGame = this.Server.findClient(Client.ClientId)

                var censoredName = await this.Server.DB.metaService.getPersistentMeta('censored_name', Client.ClientId, 'bool')

                if (censoredName && censoredName.Value) {
                    this.Server.DB.metaService.addPersistentMeta('censored_name', false, Client.ClientId)

                    inGame && this.Server.Rcon.executeCommandAsync(`rename ${inGame.Clientslot} ""`)

                    Player.Tell(Utils.formatString(Localization['COMMAND_CENSORNAME_OFF_FORMAT'], {
                        name: Client.Name
                    }))
                    return
                }

                this.Server.DB.metaService.addPersistentMeta('censored_name', true, Client.ClientId)

                var name = `user${Client.ClientId}`

                inGame && this.Server.Rcon.executeCommandAsync(`rename ${inGame.Clientslot} "${name}"`)

                Player.Tell(Utils.formatString(Localization['COMMAND_CENSORNAME_ON_FORMAT'], {
                    name: Client.Name
                }))
            })

            this.Manager.Commands.add(command)
        })(this);
    }
    async onPlayerConnect(Player) {
        var censoredName = await Player.getPersistentMeta('censored_name', 'bool')

        if (censoredName && censoredName.Value) {
            var name = `user${Player.ClientId}`

            this.Server.Rcon.executeCommandAsync(`rename ${Player.Clientslot} "${name}"`)
        }

        var role = Utils.getRoleFrom(Player.PermissionLevel, 1).Name

        var customTag = await this.Server.DB.metaService.getPersistentMeta('custom_tag', Player.ClientId)
        role = customTag ? customTag.Value : Utils.stripString(role)

        this.Server.Rcon.executeCommandAsync(`setclantagraw ${Player.Clientslot} "${role}"`)
    }
    async onPlayerDisconnect(Player) {
        this.Server.Rcon.executeCommandAsync(`rename ${Player.Clientslot} ""`)
        this.Server.Rcon.executeCommandAsync(`setclantagraw ${Player.Clientslot} ""`)
    }
}

module.exports = Plugin