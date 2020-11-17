const path              = require('path')
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const { Webhook, MessageBuilder }       = require('discord-webhook-node')
const hook              = new Webhook({ url: config.discordHookUrl, throwErrors: false, retryOnLimit: false,})
const fetch             = require('node-fetch')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const https             = require('https')

hook.setUsername('NSM Bot')

class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.Url = null
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.Server.on('disconnect', this.onPlayerDisconnect.bind(this))
        this.Server.on('penalty', this.onPlayerPenalty.bind(this))
    }
    async onPlayerConnect (Player) {
        this.sendHook(`:inbox_tray: ${Player.Name}`, ' ' ,`${await this.getUrl()}/id/${Player.ClientId}`)
        Player.on('message', async (Message) => {
            this.sendHook(`:envelope_with_arrow: ${Player.Name}`, Message, `${await this.getUrl()}/id/${Player.ClientId}`)
        })
    }
    async onPlayerDisconnect (Player) {
        this.sendHook(`:outbox_tray: ${Player.Name}`, ' ' ,`${await this.getUrl()}/id/${Player.ClientId}`)
    }
    async getUrl() {
        if (this.Url) return this.Url

        try {
            var result = (await fetch(`${config.WebfrontSSL ? 'https://' : 'http://'}${config.webfrontHostname}/api/verify`))
            var hostname = result ? config.webfrontHostname : `${(await fetch('https://api.ipify.org/?format=json')).json().ip}:${config.WebfrontPort}`
            this.Url = `${config.WebfrontSSL ? 'https://' : 'http://'}${hostname}`
    
            this.Url = this.Url
        }
        catch (e) {
            try {
                var hostname = (await (await fetch('https://api.ipify.org/?format=json')).json()).ip
                this.Url = `${config.WebfrontSSL ? 'https://' : 'http://'}${hostname}:${config.WebfrontPort}`
            }
            catch (e) {
                return null
            }
        }

        return this.Url

    }
    async getFlag (IPAddress) {
        return (await (await fetch(`https://extreme-ip-lookup.com/json/${IPAddress.split(':')[0]}`)).json()).countryCode.toLocaleLowerCase()
    }
    async onPlayerPenalty(Type, Target, Reason, Origin, Duration = -1) {
        var translation = {
            'PENALTY_TEMP_BAN': 'Temp ban',
            'PENALTY_PERMA_BAN': 'Perma ban',
            'PENALTY_KICK': 'Kick',
            'PENALTY_MUTE': 'Mute'
        }
        this.sendHookPenalty(`:hammer: ${Target.Name}`, ' ', `${await this.getUrl()}/id/${Target.ClientId}`, translation[Type], Reason, Origin, Duration)
    }
    async sendHookPenalty(Title, Description, Url, Type, Reason, Origin, Duration) {
        var messageEmbed = new MessageBuilder()
        .setTitle(Title)
        .setDescription(Description)
        .setURL(Url)
        .setColor('#00b0f4')
        .addField('Type', Type, true)
        .addField('Origin', Origin.Name, true)
        .addField('Reason', `\`${this.stripColorCodes(Reason)}\``, true)
        .setFooter('Node Server Manager')
        .setTimestamp()
        Duration > 0 && messageEmbed.addField('Duration', Utils.time2str(Duration), true)
        hook.send(messageEmbed)
    }
    stripColorCodes(string) {
        return string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), '')
    }
    async sendHook(Title, Description, Url) {
        try {
            var messageEmbed = new MessageBuilder()
            .setTitle(Title)
            .setDescription(Description)
            .setURL(Url)
            .setColor('#00b0f4')
            .addField('Hostname', `\`${this.Server.HostnameRaw.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), '')}\``, true)
            .addField('Map', `\`${this.Server.Mapname}\``, true)
            .addField('Players', `\`${this.Server.Clients.filter((value) => {return value}).length} / ${this.Server.MaxClients}\``, true)
            .setFooter('Node Server Manager')
            .setTimestamp();
            hook.send(messageEmbed)
        }
        catch (e) {}
    }
}
module.exports = Plugin