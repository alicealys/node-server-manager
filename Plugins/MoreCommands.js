const path                  = require('path')
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization          = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const config                = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const Utils                 = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const mathjs                = require('mathjs')

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.init()
    }
    init() {
        (() => {
            let command = new Command()
            .setName('calculator')
            .setAlias('calc')
            .addParam(0, 'expression', true)
            .addCallback(async (Player, Params, Args, Options, Funcs) => {
                try {
                    var result = mathjs.evaluate(Params.expression)
                    result ? Funcs.Tell( Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: result.toString() }, '%')[0] ) : Funcs.Tell(Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: Localization['COMMAND_CALC_FAIL'] }, '%')[0])
                }
                catch (e) {
                    Funcs.Tell(Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: Localization['COMMAND_CALC_FAIL'] }, '%')[0])
                }
            })
            this.Manager.Commands.Add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('socialmedia')
            .setMiddleware(true)
            .addCallback(async (Player, Params, Args, Options, Funcs, next) => {
                var sc = config.socialMedia.find((a) => a[0].toLocaleLowerCase() == Args[0].toLocaleLowerCase())
                if (!sc) {
                    next()
                    return
                }
                Funcs.Tell(Utils.formatString(Localization['COMMAND_LINKS_FORMAT'], {Name: sc[0], Url: sc[1]}, '%')[0])
            })
            this.Manager.Commands.Add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('eval')
            .addParam(0, 'js', true)
            .setPermission('ROLE_OWNER')
            .addCallback(async (Player, Params, Args, Options, Funcs) => {
                try {
                    if (process.env.NODE_ENV == 'dev') {
                        eval(Params.js)
                    }
                }
                catch (e) {
                    Player.Tell(e.toString())
                }
            })
            this.Manager.Commands.Add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('stats')
            .addParam(0, 'client', {join: true, optional: true})
            .addCallback(async (Player, Params, Args, Options, Funcs) => {
                var Target = Params.join ? Player : await this.Server.getClient(Params.join)

                if (!Target) {
                  Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
                  return
                }
                var ClientId = Target.ClientId
                var Stats = await this.Server.DB.getPlayerStatsTotal(ClientId)
                var Client = await this.Server.DB.getClient(ClientId)
                if (Stats)
                  Funcs.Tell(Localization.COMMAND_STATS_FORMAT
                  .replace('%PLAYEDTIME%', Utils.time2str(Stats.PlayedTime * 60))
                  .replace('%PERFORMANCE%', Stats.Performance.toFixed(2))
                  .replace('%NAME%', Client.Name)
                  .replace('%KILLS%', Stats.Kills)
                  .replace('%DEATHS%', Stats.Deaths)
                  .replace('%KDR%',(Stats.Kills / Math.max(Stats.Deaths, 1)).toFixed(2)))
                else Funcs.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            })
        })(this);

        (() => {
            let command = new Command()
            .setName('uptime')
            .setAlias('ut')
            .setInGame(true)
            .addCallback(async (Player, Params, Args, Options, Funcs) => {
                Funcs.Tell(Utils.formatString(Localization['COMMAND_UPTIME_FORMAT'], {uptime: Utils.time2str(this.Server.uptime)}, '%')[0])
            })
            this.Manager.Commands.Add(command)
        })(this);
    }
}

module.exports = Plugin