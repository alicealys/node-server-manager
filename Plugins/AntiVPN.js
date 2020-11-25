const path         = require('path')
const Localization = JSON.parse(process.env.Localization).lookup
const fs           = require('fs')
const fetch        = require('node-fetch')
const { Command }  = require(path.join(__dirname, `../Lib/Classes.js`))
const ipRangeCheck = require('ip-range-check')
const Utils        = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const wait         = require('delay')

class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        
        this.Server.on('connect', this.onPlayerConnected.bind(this))
        this.Server.on('preconnect', this.onPlayerConnected.bind(this))
        
        this.configPath = path.join(__dirname, '../Configuration/AntiVPNConfiguration.json')
        this.config = {
            blacklist: [],
            whitelist: [],
            clients: []
        }

        this.init()
    }
    async saveConfig() {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.configPath, JSON.stringify(this.config, null, 4), async (err) => {
                resolve()
            })
        })
    }
    async init() {
        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4))
        }

        this.config = require(this.configPath)

        var commands = new Command()
        .setName('antivpn')
        .setAlias('avpn')
        .setPermission('ROLE_ADMIN')
        .addParam({
            name: 'action'
        })
        .addCallback(async (Player, params, args) => {
            switch (params.action.toLocaleLowerCase()) {
                case 'reset':
                    this.config = {
                        blacklist: [],
                        whitelist: [],
                        clients: []
                    }

                    this.saveConfig()
                    Player.Tell(Localization['AVPN_RESET'])
                    break
                case 'clients':
                    switch (true) {
                        case (args.length == 2):
                            Player.Tell(Utils.va(Localization['AVPN_LIST'], 
                                params.action.toLocaleLowerCase(), 
                                this.config[params.action.toLocaleLowerCase()].length
                            ))
                        return
                        case (args[2].toLocaleLowerCase() == 'flush'):
                            this.config.clients = []
                            Player.Tell(Utils.va(Localization['AVPN_FLUSH'], params.action))

                            this.saveConfig()
                        return
                        case (args.length < 4):
                            Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                        return
                    }

                    var Client = await this.Server.getClient(args[3])

                    if (!Client) {
                        Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                        return
                    }

                    switch (args[2].toLocaleLowerCase()) {
                        case 'add':
                            var found = false

                            for (var i = 0; i < this.config.clients.length; i++) {
                                if (this.config.clients[i] == Client.ClientId) {
                                    found = true
                                }
                            }

                            !found && this.config.clients.push(Client.ClientId)
                            Player.Tell(Utils.va(Localization['AVPN_ADD_CLIENT'], Client.ClientId))
                            break
                        case 'remove':
                            for (var i = 0; i < this.config.clients.length; i++) {
                                if (this.config.clients[i] == Client.ClientId) {
                                    this.config.clients.splice(i, 1)
                                }
                            }
                            
                            Player.Tell(Utils.va(Localization['AVPN_REMOVE_CLIENT'], Client.ClientId))
                            break
                        default:
                            Player.Tell(Utils.va(Localization['COMMAND_ARGUMENT_INVALID'], args[2], '[add, remove]'))
                            return
                    }

                    this.saveConfig()
                break
                case 'blacklist':
                case 'whitelist':
                    if (args.length == 2) {
                        Player.Tell(Utils.va(Localization['AVPN_LIST'], params.action.toLocaleLowerCase(), this.config[params.action.toLocaleLowerCase()].length))
                        return
                    }

                    switch (args[2].toLocaleLowerCase()) {
                        case 'flush':
                            this.config[params.action.toLocaleLowerCase()] = []
                            Player.Tell(Utils.va(Localization['AVPN_FLUSH'], params.action))
                        break
                        case 'add':
                            if (args.length < 4) {
                                Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                                return
                            }

                            this.config[params.action.toLocaleLowerCase()].push(args[3])

                            Player.Tell(Utils.va(Localization['AVPN_ADD_ADDRESS'], args[3]))
                        break
                        case 'remove':
                            if (args.length < 4) {
                                Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                                return
                            }

                            for (var i = 0; i < this.config[params.action.toLocaleLowerCase()].length; i++) {
                                if (this.config[params.action.toLocaleLowerCase()][i] == args[3]) {
                                    this.config[params.action.toLocaleLowerCase()].splice(i, 1);
                                }
                            }

                            Player.Tell(Utils.va(Localization['AVPN_REMOVE_ADDRESS'], args[3]))
                        break
                        default:
                            Player.Tell(Utils.va(Localization['COMMAND_ARGUMENT_INVALID'], args[2], '[add, remove]'))
                        return
                    }

                    this.saveConfig()
                break
                case 'help':
                    var help = Localization['AVPN_HELP'].split('\n')

                    for (var i = 0; i < help.length; i++) {
                        Player.Tell(help[i])
                        await wait(300)
                    }
                break
                default:
                    Player.Tell(Utils.va(Localization['COMMAND_ARGUMENT_INVALID'], params.action, '[whitelist, blacklist, clients, help]'))
                return
            }
        })

        this.Manager.Commands.add(commands)
    }
    async onPlayerConnected(Player) {
        try {
            if (!Player.IPAddress || this.config.clients.indexOf(Player.ClientId) != -1) {
                return
            }

            var address = Player.IPAddress.split(':')[0]

            for (var i = 0; i < this.config.blacklist.length; i++) {
                if (ipRangeCheck(address, this.config.blacklist[i])) {
                    Player.Kick(Localization['AVPN_BLACKLISTED'])
                    return
                }
            }

            for (var i = 0; i < this.config.whitelist.length; i++) {
                if (ipRangeCheck(address, this.config.whitelist[i])) {
                    return
                }
            }
    
            var result = (await (await fetch(`https://api.xdefcon.com/proxy/check/?ip=${address}`)).json())
            
            if (result.proxy) {
                Player.Kick(Localization['PENALTY_VPN_KICK'])
            }
        }
        catch (e) {}
    }
}

module.exports = Plugin