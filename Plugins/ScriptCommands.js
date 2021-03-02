const path                  = require('path')
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization          = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Utils                 = new (require(path.join(__dirname, '../Utils/Utils.js')))()

var _Server = null

class Entity {
    constructor(entnum) {
        this.entnum = entnum
    }
    async call(name, ..._args) {
        const args = [..._args]

        var buffer = `level.getentbynum(${this.entnum}).${name}(`

        for (var i = 0; i < args.length; i++) {
            switch (typeof args[i]) {
                case 'string':
                    buffer += `\\"${args[i]}\\"`
                break
                case 'object':
                    buffer += args[i].code
                break
                default:
                    buffer += args[i]
                break
            }
    
            if (i < args.length - 1) {
                buffer += ', '
            }
        }

        buffer += ')'

        await _Server.Rcon.executeCommandAsync(`chai_eval ${buffer}`)
    }
    format(name, ..._args) {
        const args = [..._args]

        var buffer = `level.getentbynum(${this.entnum}).${name}(`

        for (var i = 0; i < args.length; i++) {
            switch (typeof args[i]) {
                case 'string':
                    buffer += `\\"${args[i]}\\"`
                break
                case 'object':
                    buffer += args[i].code
                break
                default:
                    buffer += args[i]
                break
            }
    
            if (i < args.length - 1) {
                buffer += ', '
            }
        }

        buffer += ')'

        return {code: buffer}
    }
}

const scripting = {
    entity: (entnum) => {
        return new Entity(entnum)
    },
    vector: (arr) => {
        return {
            code: `[${parseFloat(arr[0])},${parseFloat(arr[1])},${parseFloat(arr[2])}]`
        }
    },  
    eval: async (code) => {
        await _Server.Rcon.executeCommandAsync(`chai_eval ${code}`)
    },
    call: async (name, ..._args) => {
        const args = [..._args]

        var buffer = `gsc.${name}(`
    
        for (var i = 0; i < args.length; i++) {
            switch (typeof args[i]) {
                case 'string':
                    buffer += `\\"${args[i]}\\"`
                break
                case 'object':
                    buffer += args[i].code
                break
                default:
                    buffer += args[i]
                break
            }
    
            if (i < args.length - 1) {
                buffer += ', '
            }
        }
    
        buffer += ')'
    
        await _Server.Rcon.executeCommandAsync(`chai_eval ${buffer}`)
    }
}

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('dvars_loaded', this.init.bind(this))
    }
    init() {
        if (this.Server.Gamename != 'IW5') {
            return
        }

        _Server = this.Server

        this.Manager.Commands.add(
            new Command({
                permission: 'ROLE_ADMIN'
            })
            .setName('kill')
            .addParam({
                index: 0,
                name: 'target',
                join: true
            })
            .addCallback(async (Player, params) => {
                const Target = this.Server.findLocalClient(params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                scripting.entity(Target.Clientslot).call('suicide')
            })
        )

        this.Manager.Commands.add(
            new Command({
                permission: 'ROLE_ADMIN'
            })
            .setName('give')
            .addParam({
                index: 0,
                name: 'target',
                join: false
            })
            .addParam({
                index: 1,
                name: 'weapon',
                join: false
            })
            .addCallback(async (Player, params) => {
                const Target = this.Server.findLocalClient(params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                const weaponName = params.weapon.replace(new RegExp(/(\\|\")/g), '')
                const entity = scripting.entity(Target.Clientslot)

                await entity.call('giveweapon', weaponName)
                await entity.call('switchtoweapon', weaponName)
            })
        )

        this.Manager.Commands.add(
            new Command({
                permission: 'ROLE_ADMIN'
            })
            .setName('tp')
            .addParam({
                index: 0,
                name: 'target',
                join: true
            })
            .addCallback(async (Player, params) => {
                const Target = this.Server.findLocalClient(params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {
                    target: Target.Name, 
                    origin: 'you', 
                    coords: ''
                }))

                const entity = scripting.entity(Player.Clientslot)
                const target = scripting.entity(Target.Clientslot)

                entity.call('setorigin', target.format('getorigin'))
            })
        )

        this.Manager.Commands.add(
            new Command({
                permission: 'ROLE_ADMIN'
            })
            .setName('tphere')
            .addParam({
                index: 0,
                name: 'target',
                join: true
            })
            .addCallback(async (Player, params) => {
                const Target = this.Server.findLocalClient(params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['COMMAND_TP_FORMAT'], {
                    target: 'you', 
                    origin: Target.Name, 
                    coords: ''
                }))

                const entity = scripting.entity(Player.Clientslot)
                const target = scripting.entity(Target.Clientslot)

                target.call('setorigin', entity.format('getorigin'))
            })
        )

        this.Manager.Commands.add(
            new Command({
                permission: 'ROLE_ADMIN'
            })
            .setName('setvelocity')
            .addParam({
                index: 0,
                name: 'target',
                join: false
            })
            .addParam({
                index: 1,
                name: 'velocity',
                join: false
            })
            .addCallback(async (Player, params) => {
                const Target = this.Server.findLocalClient(params.target)

                if (!Target || !Target.Server || Target.Server.Id != Player.Server.Id) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                const entity = scripting.entity(Player.Clientslot)
                const velocity = params.velocity.split(',').map(f => parseFloat(f))
                const vector = [0.0, 0.0, 0.0]

                for (var i = 0; i < Math.min(velocity.length, 3); i++) {
                    vector[i] = velocity[i]
                }

                entity.call('setvelocity', scripting.vector(vector))
            })
        )
    }
}

module.exports = Plugin