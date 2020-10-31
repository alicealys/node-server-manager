const ejs               = require('ejs')
const config            = JSON.parse(process.env.config)
const btoa              = require('btoa')
const DiscordOauth2     = require("discord-oauth2")
const oauth             = new DiscordOauth2()

module.exports = (app, db, Webfront) => {
    if (!config.discordOAuth2Url || !config.discordClientId || !config.discordSecret) return

    const redirect = config.discordOAuth2Url

    app.get('/api/discord/callback', async (req, res, next) => {
        if (!req.session.ClientId || !req.query.code) {
            res.redirect('/')
            return
        }

        var response = await oauth.tokenRequest({
            clientId: config.discordClientId,
            clientSecret: config.discordSecret,
         
            code: req.query.code,
            scope: ['identify', 'guilds'],
            grantType: 'authorization_code',
            
            redirectUri: redirect,
        })

        var user = await oauth.getUser(response.access_token)
        Webfront.db.metaService.addPersistentMeta('discord_user', JSON.stringify(user), req.session.ClientId)
        Webfront.db.metaService.addPersistentMeta('discord_id', user.id, req.session.ClientId)

        res.redirect('/settings')
    })

    app.get('/api/discord/disconnect', async (req, res, next) => {
        if (!req.session.ClientId) {
            res.redirect('/')
            return
        }

        Webfront.db.metaService.deletePersistentMeta('discord_user', req.session.ClientId)
        Webfront.db.metaService.deletePersistentMeta('discord_id', req.session.ClientId)
        res.redirect('/settings')
    })

    app.get('/api/discord/login', async (req, res, next) => {
        res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${config.discordClientId}&scope=identify&response_type=code&redirect_uri=${encodeURIComponent(redirect)}`)
    })
}