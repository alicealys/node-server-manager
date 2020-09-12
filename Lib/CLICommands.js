const path            = require('path')
const readline        = require('readline')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils();

class CLICommands {
    constructor(Manager) {
        this.Player = {
            Name: 'Node Server Manager',
            ClientId: 1,
            inGame: false,
            Tell: (msg) => {
                console.log(this.COD2BashColor(`^7${msg}^7`))
            }
        }
        this.Manager = Manager
        rl.on('line', this.processCommand.bind(this))
    }
    COD2BashColor(string) {
        return string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), `\x1b[3$1m`)
    }
    processCommand(line) {
        this.lookup = {
            'COMMAND_NOT_FOUND' : 'Command not found, use ^3help^7 for a list of commands',
            'COMMAND_ARGUMENT_ERROR' : 'Not enough arguments supplied',
            'COMMAND_ENV_ERROR': 'This command can only be executed in-game'
        }
        var args = line.split(/\s+/)
        var command = Utils.getCommand(this.Manager.commands, args[0])
        switch (true) {
          case (!this.Manager.commands[command]):
            this.Player.Tell(this.lookup.COMMAND_NOT_FOUND)
            return
          case (this.Manager.commands[command].inGame || this.Manager.commands[command].inGame == undefined):
            this.Player.Tell(this.lookup.COMMAND_ENV_ERROR)
            return
          case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
            this.Player.Tell(this.lookup.COMMAND_ARGUMENT_ERROR)
            return

        }
        this.Manager.Server.DB.logActivity(`@${this.Player.ClientId}`, Localization['AUDIT_CMD_EXEC'].replace('%NAME%', command), args.join(' '))
        this.Manager.commands[command].callback(this.Player, args)
    }
}

module.exports = CLICommands