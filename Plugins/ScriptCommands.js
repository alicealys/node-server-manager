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
            .setInGame(true)
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
            .setInGame(true)
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
            .setInGame(true)
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
            .setInGame(true)
            .addCallback(async (Player, params) => {
                var vision = params.vision && params.vision.replace(new RegExp(/(\\|\")/g), '').length 
                    ? params.vision.replace(new RegExp(/(\\|\")/g), '') 
                    : this.Server.Mapname

                this.Server.chai.eval(`
                    var player = gsc.getEntByNum(${Player.Clientslot});
                    player.visionSetNakedForPlayer(\\"${vision}\\");
                    player.iPrintLn(\\"Vision set to ^5${vision}\\")
                `)
            })
            if (this.Server.Gamename == 'IW5')
                //this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'nvg',
            })
            .setInGame(true)
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
                //this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'leap',
                permission: 'ROLE_ADMIN'
            })
            .setInGame(true)
            .addParam({
                name: 'vel',
                optional: true
            })
            .addCallback(async (Player, params) => {
                Player.Tell('WOOOOOOOOOOO')

                var velocity = params.vel ? parseInt(params.vel) : 500
                
                this.Server.chai.eval(`
                    var player = gsc.getEntByNum(${Player.Clientslot});
                    var velocity = player.getVelocity();
                    player.setVelocity([velocity[0], velocity[1], velocity[2] + ${Number.isInteger(velocity) ? velocity : 500}]);
                `)
            })
            if (this.Server.Gamename == 'IW5')
                this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'mute',
                permission: 'ROLE_MODERATOR'
            })
            .addParams([
                {
                    index: 0,
                    name: 'target'
                },
                {
                    index: 1,
                    name: 'duration'
                },
                {
                    index: 2,
                    name: 'reason',
                    join: true
                }
            ])
            .addCallback(async (Player, params) => {
                var Client = await this.Server.getClient(params.target)

                var timeVars = {
                    'd': 86400,
                    'h': 3600,
                    'm': 60,
                    's': 1,
                }

                if (!params.duration.match(/([0-9]+)([A-Za-z]+)/)) {
                    Player.Tell(Localization.COMMAND_PARSE_TIME_ERROR)
                    return
                }
    
                var parts = Array.from(params.duration.match(/([0-9]+)([A-Za-z]+)/)).slice(1)

                switch (true) {
                    case (!Client):
                        Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                    case (Client.PermissionLevel >= Player.PermissionLevel):
                        Player.Tell(Localization['CLIENT_HIERARCHY_ERROR'])
                    return
                    case (!parts || parts.length < 2 || !timeVars[parts[1]] || !Number.isInteger(parseInt(parts[0]))):
                        Player.Tell(Localization['COMMAND_PARSE_TIME_ERROR'])
                    return
                }

                var Duration = parseInt(parts[0] * timeVars[parts[1]])

                if (Duration > 3600 * 72) {
                    Player.Tell(Localization['COMMAND_PARSE_TIME_ERROR'])
                    return
                }

                this.Server.DB.addPenalty({
                    TargetId: Client.ClientId,
                    OriginId: Player.ClientId,
                    PenaltyType: 'PENALTY_MUTE',
                    Duration: Duration,
                    Reason: params.reason
                })

                this.Server.emit('penalty', 'PENALTY_MUTE', Client, params.reason, Player, Duration)
                Player.Tell(Utils.formatString(Localization['COMMAND_MUTE_FORMAT'], {
                    Target: Client.Name,
                    Duration
                }, '%')[0])
            })

            this.Manager.Commands.add(command)
        })(this);
    }
}

module.exports = Plugin