const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup

class Commands {
    constructor() {
        this.Commands = {}
    }
    add(command) {
        this.Commands[command.name] = command
    }
    findCommand(name) {
        var found = false
        Object.entries(this.Commands).forEach(command => {
            if (command[0].toLocaleLowerCase() == name.toLocaleLowerCase() || (command[1].alias && command[1].alias.toLocaleLowerCase() == name.toLocaleLowerCase())) {
              found = this.Commands[command[0]]
            }
        })
        return found
    }
    async executeMiddleware (name, Player, args, options = { delay: true, broadcast: false }) {
        return new Promise((resolve, reject) => {
            var next = () => {
                resolve()
            }

            Object.entries(this.Commands).forEach(command => {
                if (!command[1].isMiddleware) return
    
                this.execute(command[1].name, Player, args, options = { delay: true, broadcast: false }, next)
            })
        })
    }
    execute (name, Player, args, options = { delay: true, broadcast: false }, next = null) {
        var command = this.findCommand(name)

        var funcs = {
            Tell: (string) => {
                options.broadcast ? (Player.Server.Broadcast(string)) : Player.Tell(string)
            }
        }

        switch (true) {
            case (!next && command.isMiddleware):
            case (!command):
            return
            case (command.inGame && !Player.inGame):
                Player.Tell(Localization['COMMAND_ENV_ERROR'])
            return 1
            case (Player.PermissionLevel < command.permission):
                Player.Tell(Localization['COMMAND_FORBIDDEN'])
            return 1
        }

        var defaultParam = {
            join: false,
            optional: false,
            index: 0,
            name: ''
        }

        var params = {}
        for (var i = 0; i < command.params.length; i++) {

            command.params[i] = {...defaultParam, ...command.params[i]}

            if (!args[command.params[i].index + 1]) {
                if (command.params[i].optional) continue

                Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                return 1
            }
            params[command.params[i].name] = command.params[i].join ? args.slice(command.params[i].index + 1).join(' ') : args[command.params[i].index + 1]
        }

        for (var i = 0; i < command.exceptions.length; i++) {
            if (!command.exceptions[i].callback(Player, params, args)) {
                Player.Tell(command.exceptions[i].error)
                return 1
            }
        }

        if (!command.callbacks.length) {
            command.defaultCallback(Player, args)
            return 1
        }

        for (var i = 0; i < command.callbacks.length; i++) {
            command.callbacks[i](Player, params, args, options, funcs, next)
        }

        return 1
    }
}

module.exports = Commands