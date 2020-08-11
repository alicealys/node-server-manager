const path              = require('path')
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const { Webhook, MessageBuilder }       = require('discord-webhook-node')
var hook                = new Webhook(config.discordHookUrl)
const discord           = require('discord.js')
const fetch             = require('node-fetch')

hook.setUsername('NSM Bot')

class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.Server.on('disconnect', this.onPlayerDisconnect.bind(this))
    }
    async onPlayerConnect (Player) {
        this.sendHook(`:inbox_tray: ${Player.Name}`, ' ' ,`${config.webfrontHostname}/id/${Player.ClientId}`)
        Player.on('message', async (Message) => {
            this.sendHook(`${Player.Name}`, Message, `${config.webfrontHostname}/id/${Player.ClientId}`)
        })
    }
    async onPlayerDisconnect (Player) {
        this.sendHook(`:outbox_tray: ${Player.Name}`, ' ' ,`${config.webfrontHostname}/id/${Player.ClientId}`)
    }
    async getFlag (IPAddress) {
        return (await (await fetch(`https://extreme-ip-lookup.com/json/${IPAddress.split(':')[0]}`)).json()).countryCode.toLocaleLowerCase()
    }
    async sendHook(Title, Description, Url) {
        var Hostname = (await this.Server.Rcon.getDvar('sv_hostname')).replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), '')
        var Mapname = await this.Server.Rcon.getDvar('mapname')
        var clientCount = this.Server.Clients.filter(x => x != null).length
        var maxClients = await this.Server.Rcon.getDvar('sv_maxclients')
        var messageEmbed = new MessageBuilder()
        .setTitle(Title)
        .setDescription(Description)
        .setURL(Url)
        .setColor('#00b0f4')
        .addField('Hostname', Hostname, true)
        .addField('Map', Mapname, true)
        .addField('Players', `${clientCount} / ${maxClients}`, true)
        .setFooter('Node Server Manager')
        .setTimestamp();
        hook.send(messageEmbed)
    }
}
module.exports = Plugin