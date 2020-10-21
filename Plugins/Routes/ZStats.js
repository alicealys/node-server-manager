const path              = require('path')
const ejs               = require('ejs')
const Permissions       = require(path.join(__dirname, `../../Configuration/NSMConfiguration.json`)).Permissions
const config            = require(path.join(__dirname, `../../Configuration/NSMConfiguration.json`))
const jsdom            = new require('jsdom')

module.exports = (app, db, Webfront) => {
    app.get('/api/zstats', async (req, res, next) => {
        var page = req.query.page ? req.query.page : 0
        var limit = 10
        var Stats = await db.getTopZStats(page, limit)
        for (var i = 0; i < Stats.length; i++) {
            delete Stats[i].Id
        }
        res.end(JSON.stringify(Stats))
    })

    app.get('/zstats', async (req, res, next) => {
        var Client = req.session.ClientId ? await db.getClient(req.session.ClientId) : {Name: 'Guest', ClientId: 0}
        var Motd = config.MOTD ? config.MOTD.replace('{USERNAME}', Client.Name)
                                            .replace('{CLIENTID}', Client.ClientId) : null

        res.setHeader('Content-type', 'text/html')
        var Stats = await db.getTopZStats(0, 10)
        var header = null
        ejs.renderFile(path.join(__dirname, '../../Webfront/html/header.ejs'), {session: req.session, Permissions: Permissions, Motd: Motd, Client: Client, config: config}, (err, str) => {
            var dom = new jsdom.JSDOM(str)
            for (var i = 0; i < Webfront.headerExtraHtml.length; i++) {
                var el = dom.window.document.createElement('div')
                el.innerHTML = Webfront.headerExtraHtml[i].html
                dom.window.document.getElementById('header-btns').insertBefore(el.firstChild, dom.window.document.getElementById('header-btns').children[Webfront.headerExtraHtml[i].index])
            }
            header = dom.window.document.getElementById('wf-header').outerHTML
        })

        ejs.renderFile(path.join(__dirname, '../../Webfront/html/zstats.ejs'), {header: header, Stats: Stats}, (err, str) => {
            res.end(str)
        })
    })
}