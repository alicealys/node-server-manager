const path                  = require('path')
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization          = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Utils                 = new (require(path.join(__dirname, '../Utils/Utils.js')))()

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('dvars_loaded', this.init.bind(this))
    }
    init() {
        (() => {
            let command = new Command({
                name: 'tp',
                permission: 'ROLE_ADMIN'
            })
            .addParam({
                index: 0,
                name: 'target',
                join: true
            })
            .addCallback(async (Player, Params) => {
                var Target = this.Server.findLocalClient(Params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {target: Target.Name, origin: 'you', coords: ''}, '%'))
                this.Server.chai.eval(`gsc.getEntByNum(${Player.Clientslot}).setOrigin(gsc.getEntByNum(${Target.Clientslot}).getOrigin())`)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'giveweapon',
                permission: 'ROLE_ADMIN'
            })
            .addParam({
                index: 0,
                name: 'weapon',
                join: false
            })
            .addCallback(async (Player, Params) => {
                Player.chai.forceGiveWeapon(Params.weapon.replace(new RegExp(/(\\|\")/g), ''))
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'tphere',
                permission: 'ROLE_ADMIN'
            })
            .addParam({
                index: 0,
                name: 'target',
                join: true
            })
            .addCallback(async (Player, Params) => {
                var Target = this.Server.findLocalClient(Params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {target: 'you', origin: Target.Name, coords: ''}, '%'))
                this.Server.chai.eval(`gsc.getEntByNum(${Target.Clientslot}).setOrigin(gsc.getEntByNum(${Player.Clientslot}).getOrigin())`)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);

        
        (() => {
            let command = new Command({
                name: 'vision',
            })
            .addParam({
                index: 0,
                name: 'vision',
                join: false,
                optional: true
            })
            .addCallback(async (Player, params) => {
                var vision = params.vision && params.vision.replace(new RegExp(/(\\|\")/g), '').length 
                    ? params.vision.replace(new RegExp(/(\\|\")/g), '') 
                    : this.Server.Mapname


                console.log(vision)

                this.Server.chai.eval(`
                    var player = gsc.getEntByNum(${Player.Clientslot});
                    player.visionSetNakedForPlayer(\\"${vision}\\");
                    player.iPrintLn(\\"Vision set to ^5${vision}\\")
                `)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'nvg',
            })
            .addCallback(async (Player) => {
                Player.matchData.nvg = !Player.matchData.nvg
                var vision = Player.matchData.nvg ? 'default_night_mp' : this.Server.Mapname

                this.Server.chai.eval(`
                    var player = gsc.getEntByNum(${Player.Clientslot});
                    player.visionSetNakedForPlayer(\\"${vision}\\");
                    player.iPrintLn(\\"Night Vision ${vision == 'default_night_mp' ? '^2On' : '^1Off'}\\");
                `)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);
    }
}

module.exports = Plugin