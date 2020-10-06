const path            = require('path')
const readline        = require('readline')
const Utils            = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization     = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Permissions      = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

class CLICommands {
    constructor(Manager) {
        this.Player = {
            Name: 'Node Server Manager',
            ClientId: 1,
            inGame: false,
            PermissionLevel: Permissions.Levels['ROLE_MANAGER'],
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
        var args = line.split(/\s+/)
        var command = Utils.getCommand(this.Manager.commands, args[0])
        switch (true) {
          case (!this.Manager.commands[command]):
            this.Player.Tell(Localization['COMMAND_NOT_FOUND'])
            return
          case (this.Manager.commands[command].inGame || this.Manager.commands[command].inGame == undefined):
            this.Player.Tell(Localization['COMMAND_ENV_ERROR'])
            return
          case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
            this.Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
            return

        }
        this.Manager.Server.DB.logActivity(`@${this.Player.ClientId}`, Localization['AUDIT_CMD_EXEC'].replace('%NAME%', command), args.join(' '))
        this.Manager.commands[command].callback(this.Player, args)
    }
}

module.exports = CLICommands