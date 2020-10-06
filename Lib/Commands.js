const { EventEmitter } = require('events')
const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup

class Commands {
    constructor() {
        this.Commands = {}
    }
    Add (Command) {
        this.Commands[Command.Name] = Command
    }
    findCommand(Name) {
        var found = false
        Object.entries(this.Commands).forEach(Command => {
            if (Command[0].toLocaleLowerCase() == Name.toLocaleLowerCase() || (Command[1].Alias && Command[1].Alias.toLocaleLowerCase() == Name.toLocaleLowerCase())) {
              found = this.Commands[Command[0]]
            }
        })
        return found
    }

    async executeMiddleware (Name, Player, Args, Options = { delay: true, broadcast: false }) {
        return new Promise((resolve, reject) => {
            var middlewareExecuted = new EventEmitter()
            var next = () => {
                middlewareExecuted.emit('next')
            }

            middlewareExecuted.on('next', async () => {
                resolve()
            })

            Object.entries(this.Commands).forEach(Command => {
                if (!Command[1].isMiddleware) return
    
                this.Execute(Command[1].Name, Player, Args, Options = { delay: true, broadcast: false }, next)
            })
        })
    }

    Execute (Name, Player, Args, Options = { delay: true, broadcast: false }, next = null) {
        var Command = this.findCommand(Name)

        var Funcs = {
            Tell: (string) => {
                Options.broadcast ? (Player.Server.Broadcast(string)) : Player.Tell(string)
            }
        }

        switch (true) {
            case (!next && Command.isMiddleware):
            case (!Command):
            return
            case (Command.inGame && !Player.inGame):
                Player.Tell(Localization['COMMAND_ENV_ERROR'])
            return 1
            case (Player.PermissionLevel < Command.PermissionLevel):
                Player.Tell(Localization['COMMAND_FORBIDDEN'])
            return 1
        }

        var Params = {}
        for (var i = 0; i < Command.Params.length; i++) {
            if (!Args[Command.Params[i].Index + 1]) {
                if (Command.Params[i].Options.optional) continue

                Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                return 1
            }
            Params[Command.Params[i].Name] = Command.Params[i].Options.join ? Args.slice(Command.Params[i].Index + 1).join(' ') : Args[Command.Params[i].Index + 1]
        }

        for (var i = 0; i < Command.Exceptions.length; i++) {
            if (!Command.Exceptions[i].Condition(Player, Params, Args)) {
                Player.Tell(Command.Exceptions[i].returnString)
                return 1
            }
        }

        if (!Command.Callbacks.length) {
            Command.defaultCallback(Player, Args)
            return 1
        }

        for (var i = 0; i < Command.Callbacks.length; i++) {
            Command.Callbacks[i](Player, Params, Args, Options, Funcs, next)
        }

        return 1
    }
}

module.exports = Commands