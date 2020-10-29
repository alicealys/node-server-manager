const path            = require('path')
const readline        = require('readline')
const Utils            = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization     = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Permissions      = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

class CLICommands {
    constructor(Manager, Managers) {
        this.Managers = Managers
        this.Player = {
            Name: 'Node Server Manager',
            ClientId: 1,
            inGame: false,
            PermissionLevel: Permissions.Levels['ROLE_MANAGER'],
            Tell: (msg) => {
                console.log(Utils.COD2BashColor(`^7${msg}^7`))
            }
        }

        this.Manager = Manager
        this.customCommands = {
            'chat': {
                callback: () => {
                    this.chatEnabled = !this.chatEnabled
                    this.Player.Tell(`Chat ${this.chatEnabled ? '^2enabled' : '^1disabled'}`)
                }
            }
        }

        this.streamChat()
        rl.on('line', this.processCommand.bind(this))
    }
    streamChat() {
        this.Managers.forEach(Manager => {
            Manager.Server.on('message', async (Player, Message) => {
                if (this.chatEnabled) {
                    this.Player.Tell(Utils.formatString(Localization['GLOBALCHAT_FORMAT'], {
                        Enabled: '', 
                        Name: Player.Name, 
                        Message, 
                        Hostname: Player.Server.HostnameRaw
                    }, '%')[0])
                }
            })
        })
    }

    async processCommand(line) {
        var args = line.split(/\s+/)

        if (this.customCommands[args[0].toLocaleLowerCase()]) {
            this.customCommands[args[0].toLocaleLowerCase()].callback()
            return
        }

        var executedMiddleware = await this.Manager.Commands.executeMiddleware(args[0], this.Player, args)
        if (await this.Manager.Commands.execute(args[0], this.Player, args)) return

        var command = Utils.getCommand(this.Manager.commands, args[0])

        switch (true) {
          case (!this.Manager.commands[command]):
            !executedMiddleware && this.Player.Tell(Localization['COMMAND_NOT_FOUND'])
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