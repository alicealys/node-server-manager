const path                  = require('path')
const { Command }           = require(path.join(__dirname, `../Lib/Classes.js`))
const Localization          = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Games                 = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).Games
const config                = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const Utils                 = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const mathjs                = require('mathjs')
const wait                  = require('delay')

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
            .addParam({
                index: 0,
                name: 'expression',
                join: true
            })
            .addCallback(async (Player, params, args, options, funcs) => {
                try {
                    var result = mathjs.evaluate(params.expression)
                    result ? funcs.Tell( Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: result.toString() }, '%')[0] ) : funcs.Tell(Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: Localization['COMMAND_CALC_FAIL'] }, '%')[0])
                }
                catch (e) {
                    funcs.Tell(Utils.formatString(Localization['COMMAND_CALC_RESULT'], { result: Localization['COMMAND_CALC_FAIL'] }, '%')[0])
                }
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('toggle')
            .setAlias('t')
            .addParam({
                index: 0,
                name: 'setting'
            })
            .addCallback(async (Player, params, args, options, funcs) => {
                let settingsMeta = ['location']
                if (!settingsMeta.includes(params.setting.toLocaleLowerCase())) {
                    Player.Tell(Localization['SETTING_NOT_EXIST'])
                    return
                }

                var setting = await this.Server.DB.metaService.getPersistentMeta(params.setting, Player.ClientId)

                this.Server.DB.metaService.addPersistentMeta(params.setting.toLocaleLowerCase(), !(setting && setting.Value == '1'), Player.ClientId)

                switch (params.setting.toLocaleLowerCase()) {
                    case 'location':
                        Player.Tell(Utils.formatString(Localization['SETTING_TOGGLE_FORMAT'], {setting: Utils.capitalizeFirstLetter(params.setting), value: !(setting && setting.Value == '1') ? '^1hidden' : '^2shown'}, '%')[0])
                    break
                }
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'reload'
            })
            .setPermission('ROLE_OWNER')
            .addCallback(async (Player) => {
                Player.Server.loadClientsAsync()
            })
        })(this);

        (() => {
            let command = new Command({
                isMiddleware: true
            })
            .addCallback(async (Player, params, args, options, funcs, next) => {
                if (!config.socialMedia) {
                    next()
                    return
                }

                var sc = config.socialMedia.find((a) => a[0].toLocaleLowerCase() == args[0].toLocaleLowerCase())

                if (!sc) {
                    next()
                    return
                }

                funcs.Tell(Utils.formatString(Localization['COMMAND_LINKS_FORMAT'], {name: sc[0], url: sc[1]}, '%')[0])
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command({
                name: 'reports',
                alias: 'reps',
                permission: 'ROLE_MODERATOR'
            })
            .addParam({
                index: 0,
                name: 'page',
                optional: true
            })
            .setPermission('ROLE_MODERATOR')
            .addCallback( async (Player, params, args, options, funcs) => {
                if (params.page == 'clear') {
                    this.Server.DB.clearReports()
                    Player.Tell(Localization['COMMAND_REPORTS_CLEAR'])
                    return
                }

                var Reports = Utils.chunkArray(await this.Server.DB.getActiveReports(), Player.inGame ? 4 : 15)

                if (!Reports.length) {
                    Player.Tell(Localization['COMMAND_NO_RESULT'])
                    return
                }

                var page = params.page ? Math.max(1, Math.min(parseInt(params.page), Reports.length)) : 1

                await Player.Tell(Utils.formatString(Localization['COMMAND_LIST_PAGE'], {max: Reports.length, current: page}, '%')[0])
                Player.inGame && await wait(300)

                for (var i = 0; i < Reports[page - 1].length; i++) {
                    var TargetName = await this.Server.DB.getName(Reports[page - 1][i].TargetId)
                    var OriginName = await this.Server.DB.getName(Reports[page - 1][i].OriginId)

                    Player.Tell(Utils.formatString(Localization['COMMAND_REPORTS_TELL'], {Origin: OriginName, Target: TargetName, Reason: Reports[page - 1][i].Reason}, '%')[0])

                    await wait(300)
                }

            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('report')
            .setAlias('rep')
            .addParams([
                {
                    index: 0,
                    name: 'target'
                },
                {
                    index: 1,
                    name: 'reason',
                    join: true
                }
            ])
            .addException(Utils.formatString(Localization['COMMAND_REPORT_COOLDOWN'], {time: 5}, '%')[0], (Player) => {
                return !Player.Data.lastReport || (new Date() - Player.Data.lastReport) / 1000 > 300
            })
            .addCallback( async (Player, params, args, options, funcs) => {
                var Client = await this.Server.getClient(params.target)

                if (!Client) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                this.Server.DB.addReport(Player.ClientId, Client.ClientId, params.reason)

                Player.Data.lastReport = new Date()
                Player.Tell(Localization['COMMAND_REPORT_SUCCESS'])

                this.Server.tellStaffGlobal(Utils.formatString(Localization['COMMAND_REPORT_TELL'], {Origin: Player.Name, Hostname: Player.Server.HostnameRaw,Target: Client.Name, Reason: params.reason}, '%')[0])
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('staff')
            .addCallback(async (Player, params, args, options, funcs) => {
                var staff = []
                this.Managers.forEach(Manager => {
                    staff = staff.concat(Manager.Server.getStaffMembers())
                })
                if (!staff.length) {
                    funcs.Tell(Localization['COMMAND_STAFF_NO_RESULT'])
                    return
                }
                for (var i = 0; i < staff.length; i++) {
                    funcs.Tell(Utils.formatString(Localization['COMMAND_STAFF_FORMAT'], {
                            Name: staff[i].Name, 
                            Level: staff[i].PermissionLevel, 
                            Role: Utils.getRoleFrom(staff[i].PermissionLevel, 1).Name, 
                            ClientId: staff[i].ClientId, 
                            Hostname: staff[i].Server.HostnameRaw
                    }, '%')[0])
                    await wait(500)
                }
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('whereis')
            .addParam({
                index: 0,
                name: 'player',
                join: true
            })
            .addCallback(async (Player, params, args, options, funcs) => {
                var Client = await this.Server.getClient(params.player)
                if (!Client) {
                    funcs.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                var Client = this.Server.findClient(Client.ClientId)
                if (!Client) {
                    funcs.Tell(Localization['COMMAND_CLIENT_NOT_INGAME'])
                    return
                }

                funcs.Tell(Utils.formatString(Localization['COMMAND_WHEREIS_FORMAT'], {
                    Name: Client.Name, 
                    ClientId: Client.ClientId,
                    Game: `^${Games[Client.Server.Gamename]['COLOR']}${Games[Client.Server.Gamename]['CLIENT']}`,
                    Hostname: Client.Server.HostnameRaw, 
                    address: `${Client.Server.externalIP}:${Client.Server.PORT}`
                }, '%')[0])
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('eval')
            .addParam({
                index: 0,
                name: 'js',
                join: true
            })
            .setPermission('ROLE_OWNER')
            .addCallback(async (Player, params, args, options, funcs) => {
                try {
                    console.log(params.js)
                    eval(params.js)
                }
                catch (e) {
                    Player.Tell(e.toString())
                }
            })
            if (process.env.NODE_ENV == 'dev')
                this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('stats')
            .addParam({
                index: 0,
                name: 'client',
                join: true,
                optional: true
            })
            .addCallback(async (Player, params, args, options, funcs) => {
                var Target = !params.client ? Player : await this.Server.getClient(params.client)

                if (!Target) {
                  Player.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
                  return
                }

                var ClientId = Target.ClientId
                var Stats = await this.Server.DB.getPlayerStatsTotal(ClientId)
                var Client = await this.Server.DB.getClient(ClientId)
                if (Stats)
                  funcs.Tell(Localization.COMMAND_STATS_FORMAT
                  .replace('%PLAYEDTIME%', Utils.time2str(Stats.PlayedTime * 60))
                  .replace('%PERFORMANCE%', Stats.Performance.toFixed(2))
                  .replace('%NAME%', Client.Name)
                  .replace('%KILLS%', Stats.Kills)
                  .replace('%DEATHS%', Stats.Deaths)
                  .replace('%KDR%',(Stats.Kills / Math.max(Stats.Deaths, 1)).toFixed(2)))
                else funcs.Tell(Localization.COMMAND_CLIENT_NOT_FOUND)
            })
            this.Manager.Commands.add(command)
        })(this);

        (() => {
            let command = new Command()
            .setName('uptime')
            .setAlias('ut')
            .setInGame(true)
            .addCallback(async (Player, params, args, options, funcs) => {
                funcs.Tell(Utils.formatString(Localization['COMMAND_UPTIME_FORMAT'], {uptime: Utils.time2str(this.Server.uptime)}, '%')[0])
            })
            this.Manager.Commands.add(command)
        })(this);
    }
}

module.exports = Plugin