const path                  = require('path')
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization          = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Games                 = require(path.join(__dirname, `../Configuration/Localization.json`)).Games
const config                = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const Utils                 = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const mathjs                = require('mathjs')
const wait                  = require('delay')

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('dvars_loaded', this.init.bind(this))
    }
    init() {
        (() => {
            let command = new Command()
            .setName('tp')
            .addParam(0, 'target', true)
            .setPermission('ROLE_ADMIN')
            .addCallback(async (Player, Params) => {
                var Target = this.Server.findLocalClient(Params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                var origin = await Target.chai.getOrigin()

                if (!origin) {
                    Player.Tell(Localization['COMMAND_FAILED'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {target: Target.Name, origin: 'you', coords: origin}, '%'))
                Player.chai.setOrigin(origin)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.Add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('giveweapon')
            .addParam(0, 'weapon', true)
            .setPermission('ROLE_ADMIN')
            .addCallback(async (Player, Params) => {
                Player.chai.forceGiveWeapon(Params.weapon)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.Add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('tphere')
            .addParam(0, 'target', true)
            .setPermission('ROLE_ADMIN')
            .addCallback(async (Player, Params) => {
                var Target = this.Server.findLocalClient(Params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                var origin = await Player.chai.getOrigin()

                if (!origin) {
                    Player.Tell(Localization['COMMAND_FAILED'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {target: 'you', origin: Target.Name, coords: origin}, '%'))
                Target.chai.setOrigin(origin)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.Add(command)
        })(this);
    }
}

module.exports = Plugin