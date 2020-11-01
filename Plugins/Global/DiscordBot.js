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

        bot.on('shardError', (e) => {})

        bot.on('ready', async () => {
            var guilds = bot.guilds.cache.map(guild => guild)
            guilds.forEach(async (guild) => {
                this.guildInit(guild)
            })

            bot.on('message', async (msg) => {
                if (msg.author.bot) return

                var Manager = this.Managers.find(Manager => Manager && Manager.Server.channel && Manager.Server.channel.id == msg.channel.id)

                if (!Manager && config.commandPrefixes.includes(msg.content[0])) {
                    this.onCommand(msg)
                    return
                }
                
                Manager && Manager.Server.emit('discord_message', msg)
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
    async serverLogger(category, guild, Server) {
        Server.on('message', async (Player, Message) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)
            var imageIndex = Math.max(Math.min(Player.Name[0].charCodeAt(0) % 4, 4), 0)

            var msg = this.stripMentions(Message)
            if (!msg.length) return

            Server.channel.webhook.send(msg, {
                username: Player.Name,
                avatarURL: discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${imageIndex}.png`
            })
        })
        
        Server.on('disconnect', async (Player) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)
            var imageIndex = Math.max(Math.min(Player.Name[0].charCodeAt(0) % 4, 4), 0)

            let embed = new Discord.MessageEmbed()
            .setURL(`${process.env.webfrontUrl}/id/${Player.ClientId}`)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .setTimestamp()
            .setAuthor(`${Player.Name} disconnected`, discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${imageIndex}.png`)

            Server.channel.send(embed)
        })

        Server.on('report', async (Origin, Target, Reason) => {
            var eventChannel = guild.channels.cache.find(channel => config[guild.id]['eventChannelId'] && channel.type == 'text' && channel.id == config[guild.id]['eventChannelId'])

            !config[guild.id]['modRoles'] && (config[guild.id]['modRoles'] = [], this.saveConfig())

            if (!eventChannel) {
                var eventChannel = await guild.channels.create('Events')
                eventChannel.setParent(category.id)
                eventChannel.setPosition(0, 0)
                eventChannel.updateOverwrite(guild.roles.everyone, { SEND_MESSAGES: false })

                eventChannel.overwritePermissions([
                    {
                        id: guild.id,
                        deny: ['SEND_MESSAGES'],
                    }
                ])

                config[guild.id]['eventChannelId'] = eventChannel.id
                this.saveConfig()
            }

            var modRoles = config[guild.id]['modRoles'].map(role => `<@&${role}>`)

            let embed = new Discord.MessageEmbed()
            .setTitle('Report')
            .addField('Target', Target.Name, true)
            .addField('Origin', Origin.Name, true)
            .addField('Reason', Reason, true)
            .addField('Server', Server.Hostname, true)
            .setThumbnail(`${process.env.webfrontUrl}/api/map.jpg?ServerId=${Server.Id}`)
            .setTimestamp()
            .setColor(colors[Utils.getRandomInt(0, colors.length)])

            modRoles.join(' ').length && await eventChannel.send(modRoles.join(' '))
            eventChannel.send(embed)
        })

        Server.on('connect', async (Player) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)
            var imageIndex = Math.max(Math.min(Player.Name[0].charCodeAt(0) % 4, 4), 0)

            let embed = new Discord.MessageEmbed()
            .setURL(`${process.env.webfrontUrl}/id/${Player.ClientId}`)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .setTimestamp()
            .setAuthor(`${Player.Name} connected`, discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${imageIndex}.png`)

            Server.channel.send(embed)
        })

        Server.on('map_loaded', () => {
            let embed = new Discord.MessageEmbed()
            .setTitle('Map rotated')
            .addField('Mapname', `${Server.getMapname().Alias}`, true)
            .addField('Gametype', `${Server.getGametype().Alias}`, true)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .setThumbnail(`${process.env.webfrontUrl}/api/map.jpg?ServerId=${Server.Id}`)
            .setTimestamp()

            Server.channel.send(embed)
        })

        Server.on('discord_message', async (msg) => {
            if (!Server.channel 
                || msg.channel.id != Server.channel.id 
                || msg.author.id == bot.user.id 
                || msg.author.bot) return

            var Client = await this.getClientByDiscord(msg.author.id)

            if (!Client.Name) {
                msg.reply(Utils.formatString(Localization['DISCORD_ACC_NOT_CONNECTED'], {
                    url: process.env.webfrontUrl
                }, '%'))
                return
            }

            Server.Broadcast(Utils.formatString(Localization['SOCKET_MSG_FORMAT'], {
                name: Client.Name, 
                message: msg.content
            }))
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

        this.serverLogger(category, guild, Server)

    }
    async guildInit(guild) {
        var category = guild.channels.cache.find(channel => config[guild.id] && channel.type == 'category' && channel.id == config[guild.id].categoryId)

        if (!category) {
            var category = await guild.channels.create('NSM-Servers', {
                type: 'category'
            })

            config[guild.id] = { categoryId: category.id }
            this.saveConfig()
        }

        for (var i = 0; i < this.Managers.length; i++) {
            if (this.Managers[i].Server.dvarsLoaded) {
                this.initServer(category, guild, this.Managers[i].Server)
                continue
            }

            this.Managers[i].Server.on('dvars_loaded', async (Server) => {
                this.initServer(category, guild, Server)
            })
        }
    }
    async getDiscordUser(ClientId) {
        var discordUser = await this.Server.DB.metaService.getPersistentMeta('discord_user', ClientId)
        return discordUser ? JSON.parse(discordUser.Value) : false
    }
    async getClientByDiscord(clientId) {
        var ClientId = await this.Server.DB.metaService.reversePersistentMeta('discord_id', clientId)
        var discordUser = ClientId ? await this.Server.DB.metaService.getPersistentMeta('discord_user', ClientId) : false
        var Client = ClientId ? await this.Server.DB.getClient(ClientId.ClientId) : false

        return {...discordUser, ...Client}
    }
    censorIp(string) {
        return string.replace(new RegExp(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\:?([0-9]{1,5})?/g), '**[redacted]**')
        .replace(new RegExp(/\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/g), '**[redacted]**')
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
                    buffer.push(this.censorIp(Utils.stripString(msg.toString())))
                }
            }

            Client && (Player = {...Player, ...Client})
        
            var end = () => {
                try {
                    let embed = new Discord.MessageEmbed()
                    .setColor(colors[Utils.getRandomInt(0, colors.length)])
                    .addField('\u200B', `${buffer.join('\n').substr(0, 1000)}`, true)
    
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
                case (!this.Manager.commands[command]):
                case (this.Manager.commands[command].gameTypeExclusions && this.Manager.commands[command].gameTypeExclusions.includes(this.Server.Gametype)):
                    !executedMiddleware && Player.Tell(Localization['COMMAND_NOT_FOUND'])
                    end()
                return
                case (this.Manager.commands[command].inGame || this.Manager.commands[command].inGame == undefined):
                    Player.Tell(Localization['COMMAND_ENV_ERROR'])
                    end()
                return
                case (Player.PermissionLevel < Permissions.Levels[this.Manager.commands[command].Permission]):
                    Player.Tell(Localization['COMMAND_FORBIDDEN'])
                    end()
                return
                case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
                    Player.Tell(Localization['COMMAND_ARGUMENT_ERROR'])
                    Player.Tell(Utils.formatString(Localization['COMMAND_COMMAND_USAGE'], {
                        prefix: config.commandPrefixes[0],
                        usage: Localization[`USAGE_${command.toLocaleUpperCase()}`]
                    }))
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