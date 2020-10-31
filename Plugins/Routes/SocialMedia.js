const path              = require('path')
const ejs               = require('ejs')
const config            = require(path.join(__dirname, `../../Configuration/NSMConfiguration.json`))

module.exports = (app, db, Webfront) => {
    if (!config.socialMedia) return

    var validLinks = config.socialMedia.filter(link => link[1].toString().match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g))

    app.get('/links', async (req, res, next) => {
        var header = await Webfront.renderDynamicHTML(req)

        ejs.renderFile(path.join(__dirname, '../../Webfront/html/links.ejs'), {
            header, validLinks
        }, (err, str) => {
            res.end(str)
        })
    })
    
    validLinks.forEach(link => {
        app.get(`/${link[0].toString()}`, async (req, res, next) => {
            res.status(301).redirect(link[1].toString())
        })
    })

    Webfront.addHeaderHtml(`<a href='/links' class='wf-header-link'><i class="fas fa-link"></i></a>`, 5)
}