const path          = require('path')
const configName    = path.join(__dirname, `../../Configuration/NSMConfiguration.json`)
const config        = require(path.join(__dirname, `../../Configuration/NSMConfiguration.json`))
const Discord       = require('discord.js')
const bot           = new Discord.Client()
const Utils         = new (require(path.join(__dirname, '../../Utils/Utils.js')))()
const token         = config.discordBotToken
const Permissions   = require(path.join(__dirname, `../../Configuration/NSMConfiguration.json`)).Permissions
const Localization  = require(path.join(__dirname, `../../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const fs            = require('fs')
const wait          = require('delay')

const colors = ['#FF3131', '#86C000', '#FFAD22', '#0082BA', '#25BDF1', '#9750DD']
var guilds = []

let customCommands = {
    
}
var modifiedConfig = false

class Plugin {
    constructor(Managers) {
        this.Managers = Managers
        this.Manager = Managers[0]
        this.Server = this.Manager.Server
        this.clientCache = {}

        if (!token) return
        this.discordBot()
    }
    discordBot() {
        bot.login(token)

        bot.on('ready', async () => {
            var guilds = bot.guilds.cache.map(guild => guild)
            guilds.forEach(async (guild) => {
                this.guildInit(guild)
            })

            bot.on('message', async (msg) => {
                if (!config.commandPrefixes.includes(msg.content[0])) return
        
                this.onCommand(msg)
            })
        })
    }
    async saveConfig() {
        fs.writeFile(configName, JSON.stringify(config, null, 4), (err) => {
            if (err) {
                console.log(err)
                return
            }
        })
    }
    stripMentions(string) {
        return string.replace(new RegExp(/((<@(.*?)>)|(@(.*?)))/g), '(@)')
    }
    async serverLogger(Server) {
        console.log(Server)
        Server.on('message', async (Player, Message) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)

            Server.channel.webhook.send(this.stripMentions(Message), {
                username: Player.Name,
                avatarURL: discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
            })
        })

        bot.on('message', async (msg) => {
            if (!Server.channel || msg.channel.id != Server.channel.id || msg.author.id == bot.user.id || msg.author.bot) return

            var Client = await this.getClientByDiscord(msg.author.id)

            if (!Client.Name) {
                return
            }

            Server.Broadcast(Utils.formatString(Localization['SOCKET_MSG_FORMAT'], {name: Client.Name, message: msg.content}))
        })
    }
    async initServer(category, guild, Server) {
        var channel = guild.channels.cache.find(channel => config.Servers[Server.Id][guild.id] && channel.id == config.Servers[Server.Id][guild.id].channelId)

        if (!channel) {
            await wait(500)
            var channel = await guild.channels.create(Utils.stripString(Server.Hostname))
            config.Servers[Server.Id][guild.id] = { ...config.Servers[Server.Id][guild.id], channelId: channel.id }
            this.saveConfig()
        }

        channel.setParent(category.id)

        var webhook = await channel.fetchWebhooks()

        webhook = webhook.first()
        
        if (!webhook) {
            var webhook = await channel.createWebhook('NSM Bot')
        }

        channel.webhook = webhook

        Server.channel = channel
        Server.emit('discord_ready')

    }
    async guildInit(guild) {
        var category = guild.channels.cache.find(channel => config[guild.id] && channel.type == 'category' && channel.id == config[guild.id].categoryId)

        if (!category) {
            var category = await guild.channels.create('NSM-Servers', {
                type: 'category'
            })

            config[guild.id] = { categoryId: category.id }
        }


        for (var i = 0; i < this.Managers.length; i++) {
            if (this.Managers[i].Server.dvarsLoaded) {
                await this.initServer(category, guild, this.Managers[i].Server)
                this.serverLogger(this.Managers[i].Server)
                return
            }

            this.Managers[i].on('dvars_loaded', async () => {
                await this.initServer(category, guild, this.Managers[i].Server)
                this.serverLogger(this.Managers[i].Server)
            })
        }
    }
    async getDiscordUser(ClientId) {
        var discordUser = await this.Server.DB.metaService.getPersistentMeta('discord_user', ClientId)
        return discordUser ? JSON.parse(discordUser.Value) : false
    }
    async getClientByDiscord(clientId) {
        if (this.clientCache[clientId]) return this.clientCache[clientId]

        var ClientId = await this.Server.DB.metaService.reversePersistentMeta('discord_id', clientId)
        var discordUser = ClientId ? await this.Server.DB.metaService.getPersistentMeta('discord_user', ClientId) : false
        var Client = ClientId ? await this.Server.DB.getClient(ClientId.ClientId) : false

        this.clientCache[clientId] = Client
        return {...discordUser, ...Client}
    }
    async onCommand(msg) {
        try {
            var ClientId = await this.Server.DB.metaService.reversePersistentMeta('discord_id', msg.author.id)
            var Client = ClientId ? await this.Server.DB.getClient(ClientId.ClientId) : false

            var args = msg.content.substr(1).split(/\s+/g)
            
            var buffer = []
            var Player = {
                PermissionLevel: 0,
                ClientId: 0,
                inGame: false,
                Tell: (msg) => {
                    buffer.push(msg)
                }
            }

            Client && (Player = {...Player, ...Client})
        
            var end = () => {
                for (var i = 0; i < buffer.length; i++) {
                    buffer[i] = Utils.stripString(buffer[i])
                }

                try {
                    let embed = new Discord.MessageEmbed()
                    .setColor(colors[Utils.getRandomInt(0, colors.length)])
                    .addField('\u200B', `${buffer.join('\n')}`, true)
    
                    msg.channel.send(embed)
                }
                catch (e) {}
            }
        
            var executedMiddleware = await this.Manager.Commands.executeMiddleware(args[0], Player, args)
            if (await this.Manager.Commands.execute(args[0], Player, args)) {
                end()
                return
            }
        
            var command = Utils.getCommand(this.Manager.commands, args[0])
        
            switch (true) {
                case (this.Manager.commands[command].inGame || this.Manager.commands[command].inGame == undefined):
                    Player.Tell(Localization['COMMAND_ENV_ERROR'])
                    end()
                return
                case (!this.Manager.commands[command]):
                case (this.Manager.commands[command].gameTypeExclusions && this.Manager.commands[command].gameTypeExclusions.includes(this.Server.Gametype)):
                    !executedMiddleware && Player.Tell(Localization.COMMAND_NOT_FOUND)
                    end()
                return
                case (Player.PermissionLevel < Permissions.Levels[this.Manager.commands[command].Permission]):
                    Player.Tell(Localization.COMMAND_FORBIDDEN)
                    end()
                return
                case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
                    Player.Tell(Localization.COMMAND_ARGUMENT_ERROR)
                    Player.Tell(`Usage: ^6${config.commandPrefixes[0]}^7${Localization[`USAGE_${command.toLocaleUpperCase()}`]}`)
                    end()
                return
            }
        
            await this.Manager.commands[command].callback(Player, args, false)
            end()
        }
        catch (e) {
            console.log(e)
        }
    }
}

module.exports = Plugin