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
    Execute (Name, Player, Args) {
        var Command = this.findCommand(Name)

        if (!Command) return

        var Params = {}
        for (var i = 0; i < Command.Params.length; i++) {
            if (!Args[Command.Params[i].Index + 1]) {
                Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                return 1
            }
            Params[Command.Params[i].Name] = Command.Params[i].Join ? Args.slice(Command.Params[i].Index + 1).join(' ') : Args[Command.Params[i].Index + 1]
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
            Command.Callbacks[i](Player, Params, Args)
        }

        return 1
    }
}

module.exports = Commands