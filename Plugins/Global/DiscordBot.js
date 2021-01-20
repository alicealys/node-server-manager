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
const moment        = require('moment')

const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

const colors = ['#FF3131', '#86C000', '#FFAD22', '#0082BA', '#25BDF1', '#9750DD']

var databaseCache = {}

var stringInsert = (string, index, length, substr) => {
    var left = string.slice(0, index)
    var right = string.slice(index + length, string.length)

    left += substr
    left += right

    return left
}

var formatColors = (string) => {
    var open = false

    for (var i = 0; i < string.length; i++) {
        if (string[i] == '^' && string[i + 1] && string[i + 1].match(/[0-9]/g)) {
            if (string[i + 1] == '7') {
                open = false

                string = stringInsert(string, i, 2, '\u200B**\u200B')

                continue
            }

            string = stringInsert(string, i, 2, open ? '\u200B**\u200B**\u200B' : '\u200B**\u200B')

            open = true
        }
    }
    
    if (open) {
        string += '\u200B**\u200B'
    }

    return string
}

const pagedMessage = async (original, callback, options) => {
    var defaultOptions = {timeout: 60 * 1000, max: 0}
    options = {...defaultOptions, ...options}

    var page = 0

    var msg = await original.channel.send(callback(page))

    const backward = '⬅'
    const forward = '➡'

    await msg.react(backward)
    await msg.react(forward)

    var onReaction = async (reaction, user) => {
        if (reaction.message.id != msg.id || user.id != original.author.id) {
            return
        }

        switch (reaction.emoji.name) {
            case (backward):
                previous = page
                page = clamp(--page, 0, options.max)

                previous != page && msg.edit(callback(page))
                break
            case (forward):
                previous = page
                page = clamp(++page, 0, options.max)

                previous != page && msg.edit(callback(page))
                break
        }

        reaction.users.remove(user.id)
    }

    bot.on('messageReactionAdd', onReaction)

    setTimeout(() => {
        bot.removeListener('messageReactionAdd', callback)
    }, options.timeout)

    return msg
}

var discordUsers = {}

class Plugin {
    constructor(Managers) {
        this.Managers = Managers
        this.Manager = Managers[0]
        this.Server = this.Manager.Server
        this.clientCache = {}

        this.commands = {
            'help': async (msg, user, args) => {
                var commands = Object.entries({...this.Manager.commands, ...this.Manager.Commands.Commands})
                .filter(command => { 
                    return !command[1].isMiddleware && (Permissions.Levels[command[1].Permission] == 0 || command[1].PermissionLevel == 0)
                })

                var chunkedCommands = Utils.chunkArray(commands, 5)

                pagedMessage(msg, (page) => {
                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Page ${page + 1} / ${chunkedCommands.length}`)

                    for (var i = 0; i < chunkedCommands[page].length; i++) {
                        embed.addField(
                            chunkedCommands[page][i][0],
                            Localization[`COMMAND_${chunkedCommands[page][i][0].toLocaleUpperCase()}`],
                            false
                        )
                    }

                    return embed
                }, { max: chunkedCommands.length - 1})
            },
            'find': async (msg, user, args) => {
                var name = args.splice(1).join(' ')
                var matches = await this.Server.DB.getClientByName(name, 20)

                if (matches.length <= 0) { 
                    msg.author.tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return 
                }

                user.lastMatches = matches

                var chunkedMatches = Utils.chunkArray(matches, 5)

                pagedMessage(msg, (page) => {
                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Page ${page + 1} / ${chunkedMatches.length}`)

                    for (var i = 0; i < chunkedMatches[page].length; i++) {
                        var text = formatColors(Utils.formatString(Localization['COMMAND_FIND_FORMAT'], {
                            index: page * 5 + i + 1,
                            Name: chunkedMatches[page][i].Name,
                            ClientId: chunkedMatches[page][i].ClientId,
                            Role: Utils.stripString(Utils.getRoleFrom(chunkedMatches[page][i].PermissionLevel, 1).Name),
                            Active: moment(chunkedMatches[page][i].LastConnection).calendar(),
                            Joined: moment(chunkedMatches[page][i].FirstConnection).calendar()
                        }, '%')[0])

                        embed.addField(
                            '\u200B',
                            text,
                            false
                        )
                    }

                    return embed
                }, {max: chunkedMatches.length - 1})
            },
            'servers': async (msg, user, args) => {
                if (this.Managers.length <= 0) {
                    return
                }

                var chunkedManagers = Utils.chunkArray(this.Managers.concat().filter(m => m.Server.dvarsLoaded), 5)

                pagedMessage(msg, (page) => {
                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Page ${page + 1} / ${chunkedManagers.length}`)

                    for (var i = 0; i < chunkedManagers[page].length; i++) {
                        embed.addField(
                            `${Utils.stripString(chunkedManagers[page][i].Server.Hostname)} - ${chunkedManagers[page][i].Server.externalIP}`,
                            `${chunkedManagers[page][i].Server.getMapname().Alias} - ${chunkedManagers[page][i].Server.getClients().length} / ${chunkedManagers[page][i].Server.Clients.length}`,
                            false
                        )
                    }

                    return embed
                })
            }
        }

        if (!token) return
        this.discordBot()
    }
    async updateActivity() {
        bot.user.setStatus('online')
        bot.user.setActivity(Utils.formatString(Localization['DISCORD_BOT_ACTIVITY'], {
                totalSlots: this.Managers.reduce((a, {Server}) => a + Server.Clients.length, 0),
                onlineClients: this.Managers.reduce((a, {Server}) => a + Server.getClients().length, 0),
                totalServers: this.Managers.filter(m => m.Server.Rcon.isRunning).length
            }, '%')[0], { 
                type: 'WATCHING',
                url: process.env.webfrontUrl
        })
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

            setInterval(() => {
                this.updateActivity()
            }, 5000)

            setInterval(() => {
                databaseCache = {}
            }, 60 * 1000 * 5)
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
    getServerIcon(Server) {
        var imgPath = path.join(__dirname, `../../Webfront/Public/img/maps/${Server.Gamename.toLocaleLowerCase()}/${Server.Mapname}.jpg`)
        
        return fs.existsSync(imgPath) ? imgPath : path.join(__dirname, `../../Webfront/Public/img/maps/default.png`)
    }
    getServerIconName(Server) {
        var imgPath = path.join(__dirname, `../../Webfront/Public/img/maps/${Server.Gamename.toLocaleLowerCase()}/${Server.Mapname}.jpg`)
        
        return fs.existsSync(imgPath) ? `${Server.Mapname}.jpg` : `default.png`
    }
    async serverLogger(category, guild, Server) {
        this.updateActivity()

        Server.on('message', async (Player, Message) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)

            var msg = Utils.stripString(this.stripMentions(Message))
            if (!msg.length) return

            Server.channel.webhook.send(msg, {
                username: Player.Name,
                avatarURL: discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`
            })
        })

        Server.on('penalty', async (Type, Target, Reason, Origin, Duration = -1) => {
            let embed = new Discord.MessageEmbed()
            .setTitle(`:hammer: Penalty`)
            .setDescription(Utils.formatString(Localization['DISCORD_BOT_PENALTY'], {
                target: Target.Name,
                targetUrl: `${process.env.webfrontUrl}/id/${Target.ClientId}`,
                penaltyName: `**${Localization[Type].toLocaleLowerCase()}**`,
                origin: Origin.Name,
                originUrl: `${process.env.webfrontUrl}/id/${Origin.ClientId}`,
                duration: Duration > 0 ? `(${Utils.time2str(Duration)})` : '',
                reason: `**${Utils.stripString(this.stripMentions(Reason))}**`
            }))
            .addField('Target', `[${Target.Name}](${process.env.webfrontUrl}/id/${Target.ClientId})`, true)
            .addField('Origin', `[${Origin.Name}](${process.env.webfrontUrl}/id/${Origin.ClientId})`, true)
            .addField('Reason', Utils.stripString(Reason), true)
            .setTimestamp()
            .setColor(colors[Utils.getRandomInt(0, colors.length)])

            Duration > 0 && embed.addField('Duration', Utils.time2str(Duration), true)

            guild.eventChannel.send(embed)
        })

        Server.on('report', async (Origin, Target, Reason) => {
            var modRoles = config[guild.id]['modRoles'].map(role => `<@&${role}>`)

            let embed = new Discord.MessageEmbed()
            .setTitle(':triangular_flag_on_post: Report')
            .setDescription(Utils.formatString(Localization['DISCORD_BOT_REPORT'], {
                target: Target.Name,
                targetUrl: `${process.env.webfrontUrl}/id/${Target.ClientId}`,
                origin: Origin.Name,
                originUrl: `${process.env.webfrontUrl}/id/${Origin.ClientId}`,
                reason: `**${Utils.stripString(this.stripMentions(Reason))}**`
            }))
            .addField('Target', `[${Target.Name}](${process.env.webfrontUrl}/id/${Target.ClientId})`, true)
            .addField('Origin', `[${Origin.Name}](${process.env.webfrontUrl}/id/${Origin.ClientId})`, true)
            .addField('Reason', Utils.stripString(Reason), true)
            .addField('Server', Utils.stripString(Server.Hostname), true)
            .setTimestamp()
            .setColor(colors[Utils.getRandomInt(0, colors.length)])

            modRoles.join(' ').length && await guild.eventChannel.send(modRoles.join(' '))
            guild.eventChannel.send(embed)
        })

        Server.on('round_start', async (roundNumber) => {
            let embed = new Discord.MessageEmbed()
            .setTitle('Round started')
            .addField(roundNumber, '\u200B', true)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .attachFiles([this.getServerIcon(Server)])
            .setThumbnail(`attachment://${this.getServerIconName(Server)}`)
            .setTimestamp()
            .setFooter(`${Server.getClients().length} / ${Server.Clients.length}`)

            Server.channel.send(embed)
        })

        Server.on('disconnect', async (Player) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)

            let embed = new Discord.MessageEmbed()
            .setURL(`${process.env.webfrontUrl}/id/${Player.ClientId}`)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .setTimestamp()
            .setAuthor(`${Player.Name} disconnected`, discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`)
            .setFooter(`${Server.getClients().length} / ${Server.Clients.length}`)

            Server.channel.send(embed)

            this.updateActivity()
        })

        Server.on('connect', async (Player) => {
            var discordUser = await this.getDiscordUser(Player.ClientId)

            let embed = new Discord.MessageEmbed()
            .setURL(`${process.env.webfrontUrl}/id/${Player.ClientId}`)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .setTimestamp()
            .setAuthor(`${Player.Name} connected`, discordUser ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`)
            .setFooter(`${Server.getClients().length} / ${Server.Clients.length}`)

            Server.channel.send(embed)

            this.updateActivity()
        })

        Server.on('map_loaded', () => {
            let embed = new Discord.MessageEmbed()
            .setTitle('Map rotated')
            .addField('Mapname', `${Server.getMapname().Alias}`, true)
            .addField('Gametype', `${Server.getGametype().Alias}`, true)
            .setColor(colors[Utils.getRandomInt(0, colors.length)])
            .attachFiles([this.getServerIcon(Server)])
            .setThumbnail(`attachment://${this.getServerIconName(Server)}`)
            .setTimestamp()
            .setFooter(`${Server.getClients().length} / ${Server.Clients.length}`)

            Server.channel.send(embed)

            this.updateActivity()
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

        guild.eventChannel = eventChannel

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
        if (databaseCache[ClientId]) return databaseCache[ClientId]

        var discordUser = await this.Server.DB.metaService.getPersistentMeta('discord_user', ClientId)
        databaseCache[ClientId] = discordUser ? JSON.parse(discordUser.Value) : false

        return databaseCache[ClientId]
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

            if (!discordUsers[msg.author.id.toString()]) {
                discordUsers[msg.author.id.toString()] = {}
            }

            var user = discordUsers[msg.author.id.toString()]

            if (user.lastMatches) {
                msg.content = msg.content.replace(new RegExp(/#([0-9]+)/g), (n) => {
                    var num = Math.max(parseInt(n.substr(1)), 1) - 1

                    if (user.lastMatches[num]) {
                        return `@${user.lastMatches[num].ClientId}`
                    }

                    return n
                })
            }

            var args = msg.content.substr(1).split(/\s+/g)

            var buffer = []

            if (this.commands[args[0].toLocaleLowerCase()]) {
                msg.author.tell = (text) => {
                    let embed = new Discord.MessageEmbed()
                    .setColor(colors[Utils.getRandomInt(0, colors.length)])
                    .addField('\u200B', `${text.substr(0, 1000)}`, true)

                    msg.channel.send(embed)
                }

                this.commands[args[0].toLocaleLowerCase()](msg, user, args)
                return
            }

            var Player = {
                PermissionLevel: 0,
                discordUser: msg.author.id,
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
        catch (e) {}
    }
}

module.exports = Plugin
