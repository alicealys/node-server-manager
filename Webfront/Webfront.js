const express   = require('express')
const jshtml    = require('jshtml')
const path      = require('path')
const fs        = require('fs')
const session   = require('express-session')
const ejs       = require('ejs')
const moment    = require('moment')
const bodyParser= require('body-parser')
const bcrypt    = require('bcrypt')
const fetch     = require('node-fetch')
const ws        = require('ws')
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const configName = path.join(__dirname, `../Configuration/NSMConfiguration.json`)
const config = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const https     = require('https')
const http = require('http')
const rateLimit = require("express-rate-limit")
const Database  = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()

var lookup = {
    errors: {
        404: 'This is not the page you are looking for...'
    }
}

function getRoleFrom (Value, Type) {
    switch (Type) {
      case 0:
        var RolesArray = Object.entries(Permissions.Roles)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1].toLocaleLowerCase() == Value.toLocaleLowerCase()) {
            return {
              Name: RolesArray[i][1],
              Level: Permissions.Levels[RolesArray[i][0]]
            }
          }
        }
      break;
      case 1:
        var RolesArray = Object.entries(Permissions.Levels)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1] == Value) {
            return {
              Name: Permissions.Roles[RolesArray[i][0]],
              Level: RolesArray[i][1]
            }
          }
        }
      break;
    }
    return false
}

class Webfront {
    constructor(Managers, Config) {
        this.Managers = Managers
        this.pollRate = 300000
        this.Config = Config
        this.socketClients = []
        this.Start()
    }
    async getClientStatus(Guid) {
        var Status = { Online: false}
        for (var o = 0; o < this.Managers.length; o++) {
            var Manager = this.Managers[o]
            /*if (!Manager.Server.Rcon.isRunning) continue
            var status = await Manager.Server.Rcon.getStatus()
            if (!status) status = Manager.Server.previousStatus*/
            for (var i = 0; i < Manager.Server.Clients.length; i++) {
                var client = Manager.Server.Clients[i]
                if (!client) continue
                if (client.Guid == Guid) {
                    Status.Online = true
                    Status.Hostname = Manager.Server.HostnameRaw
                    break
                }
            }
        }
        return Status;
    }
    Start() {
        this.app = express()

        const server = this.Config.SSL ? https.createServer({
            key: fs.readFileSync(this.Config.Key),
            cert: fs.readFileSync(this.Config.Cert),
        }, this.app) : http.createServer(this.app)
        const socket = new ws.Server({ server: server });

        server.listen(this.Config.Port, () => {
            console.log(`Webfront bound to port ${this.Config.Port}, SSL ${this.Config.SSL}`)
        })
        
        this.Socket(socket)

        this.app.use(express.static(path.join(__dirname, '/Public')))
        this.app.use(bodyParser.urlencoded({ extended: true }))
        this.app.use(bodyParser.json())

        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 50,
            message: JSON.stringify({
                success: false,
                error: 'Too many requests'
            })
        });
        
        //this.app.use('/auth/*', apiLimiter)


        var salt1 = bcrypt.genSaltSync();
        var salt2 = bcrypt.genSaltSync();
        var secret = bcrypt.hashSync(salt1 + salt2, 10);

        this.sessionParser = session({
            secret: secret,
            rolling: true,
            resave: true,
            saveUninitialized: true,
            cookie: {
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'Strict'
            }
        })

        this.app.use(this.sessionParser)

        var header = null
        this.app.use(async (req, res, next) => {
            var Client = req.session.ClientId ? await db.getClient(req.session.ClientId) : {Name: 'Guest', ClientId: 0}
            var Motd = config.MOTD ? config.MOTD.replace('{USERNAME}', Client.Name)
                                                .replace('{CLIENTID}', Client.ClientId) : null
            ejs.renderFile(path.join(__dirname, '/html/header.ejs'), {session: req.session, Permissions: Permissions, Motd: Motd, Client: Client, config: config}, (err, str) => {
                header = str
            });
            next()
        })

        this.app.get('/', async (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            var Client = null
            if (req.session.ClientId) {
                Client = await db.getClient(req.session.ClientId)
            }
            ejs.renderFile(path.join(__dirname, '/html/index.ejs'), {header: header, session: req.session, Client: Client}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/api/discord/callback', async (req, res, next) => {
            
        })

        this.app.post('/auth/logout', async (req, res, next) => {
            req.session.destroy()
            res.end()
        })
        this.app.post('/auth/changepassword', async (req, res, next) => {

            switch (true) {
                case (!req.session.ClientId):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Not logged in'
                    }))
                    return;
                case (!req.body.password || !req.body.previous):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Parameters missing'
                    }))
                    return;
            }
            
            var tokenHash = await db.getTokenHash(req.session.ClientId)
            var passwordHash = await db.getClientField(req.session.ClientId, 'Password')

            bcrypt.compare(req.body.previous, tokenHash.Token, function(err, result) {
                if (!result) {
                    bcrypt.compare(req.body.previous, passwordHash, (err, same) => {
                        if (!same) {
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Invalid credentials'
                            })) 
                            return
                        }
                        bcrypt.hash(req.body.password, 10, async (err, hash) => {
                            await db.setClientField(req.session.ClientId, 'Password', hash)
                            res.end(JSON.stringify({
                                success: true
                            }))
                        });
                    })
                } else {
                    if ((new Date() - new Date(tokenHash.Date)) / 1000  > 120) {
                        res.end(JSON.stringify({
                            success: false,
                            error: 'Invalid Credentials'
                        }))
                        return
                    }
                    bcrypt.hash(req.body.password, 10, async (err, hash) => {
                        await db.setClientField(req.session.ClientId, 'Password', hash)
                        res.end(JSON.stringify({
                            success: true
                        }))
                    });
                }
            })
        })
        this.app.post('/auth/login', async (req, res, next) => {
            if (req.body.ClientId == undefined || req.body.Token == undefined) {
                res.end(JSON.stringify({
                    success: false,
                    error: 'Parameters missing'
                }))
                return
            }

            var tokenHash = await db.getTokenHash(req.body.ClientId)
            var passwordHash = await db.getClientField(req.body.ClientId, 'Password')

            bcrypt.compare(req.body.Token, tokenHash.Token, function(err, result) {
                if (!result) {
                    bcrypt.compare(req.body.Token, passwordHash, function(err, result) {
                        if (result) {
                            req.session.ClientId = req.body.ClientId
                            res.end(JSON.stringify({
                                success: true,
                            }))
                        } else {
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Invalid credentials'
                            }))
                        }
                    })
                } else {
                    if (!tokenHash || (new Date() - new Date(tokenHash.Date)) / 1000  > 120) {
                        res.end(JSON.stringify({
                            success: false,
                            error: 'Invalid Credentials'
                        }))
                        return
                    }
                    req.session.ClientId = req.body.ClientId
                    res.end(JSON.stringify({
                        success: result
                    }))
                }
            })
        })

        var timeConvert = (n) => {
            var num = n;
            var hours = (num / 60);
            var rhours = Math.floor(hours);
            var minutes = (hours - rhours) * 60;
            var rminutes = Math.round(minutes);
            return `${rhours}:${rminutes}`
        }

        this.app.get('/stats', async (req, res, next) => {
            var sort = req.query.sort ? req.query.sort : 'Kills'
            var Stats = await db.getStats(0, 50, sort)
            Stats.forEach(Stat => {
                Stat.PlayedTimeString = (Stat.PlayedTime / 60).toFixed(1) + ' hrs'
                Stat.Performance = Stat.Performance.toFixed(1)
                Stat.KDR = (Stat.Kills / Math.max(1, Stat.Deaths) ).toFixed(2)
            })
            res.setHeader('Content-type', 'text/html')
            ejs.renderFile(path.join(__dirname, '/html/stats.ejs'), {header: header, Stats: Stats, moment: moment}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/api/statistics', async (req, res, next) => {
            var getPlayerCount = () => {
                var count = 0
                this.Managers.forEach(m => count += m.Server.Clients.filter((value) => { return value }).length)
                return count
            }
            var Managers = this.Managers.concat()
            var topServer = Managers.sort((a, b) => {return b.Server.Clients.filter((value) => { return value }).length - a.Server.Clients.filter((value) => { return value }).length})[0].Server
            var statistics = {
                serverCount: this.Managers.length,
                playerCount: getPlayerCount(),
                topServer: {
                    playerCount: topServer.Clients.filter((value) => { return value }).length,
                    Hostname: topServer.HostnameRaw,
                    IP: topServer.externalIP,
                    PORT: topServer.PORT
                }
            }
            res.end(JSON.stringify(statistics))
        })

        this.app.get('/info', async (req, res, next) =>  {
            res.setHeader('Content-type', 'text/html')
            var Client = req.session.ClientId ? await db.getClient(req.session.ClientId) : null
            ejs.renderFile(path.join(__dirname, '/html/info.ejs'), {header: header, Client: Client, Info: config.Info, Permissions: Permissions}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/api/stats', async (req, res, next) => {
            var sort = req.query.sort ? req.query.sort : 'Kills'
            var Stats = await db.getStats(req.query.page, req.query.limit, sort)
            Stats.forEach(Stat => {
                Stat.PlayedTimeString = (Stat.PlayedTime / 60).toFixed(1) + ' hrs'
                Stat.Performance = Stat.Performance.toFixed(1)
                Stat.KDR = (Stat.Kills / Math.max(1, Stat.Deaths) ).toFixed(2)
                Stat.Name = Stat.Client.Name
                delete Stat.Client
            })
            res.end(JSON.stringify(Stats))
        })
        this.app.get('/api/admin', async (req, res, next) => {
            switch (true) {
                case (!req.session.ClientId):
                    res.status(401)
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Unauthorized'
                    }))
                return
                case (!req.query.command):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Parameters missing'
                    }))
                return
            }

            var Client = await db.getClient(req.session.ClientId)

            switch (true) {
                case (!Permissions.Commands[req.query.command.toLocaleUpperCase()]):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Command not found'
                    }))
                return
                case (Client.PermissionLevel < Permissions.Levels[Permissions.Commands[req.query.command.toLocaleUpperCase()]]):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Forbidden'
                    }))
                return
            }

            var findClient = (ClientId) => {
                var found = false;
                this.Managers.forEach(Manager => {
                    Manager.Server.Clients.forEach(Client => {
                        if (!Client) return
                        if (Client.ClientId == ClientId) {
                            found = Client;
                        }
                    })
                })
                return found;
            }
            var inGame = req.query.target ? findClient(req.query.target) : null
            switch (req.query.command.toLocaleUpperCase()) {
                case 'COMMAND_BAN':
                    switch (true) {
                        case (!req.query.target || !req.query.reason):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Parameters missing'
                            }))
                        return
                        case (Client.PermissionLevel < inGame.PermissionLevel):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Forbidden'
                            }))
                        return
                    }
                    inGame ? inGame.Ban(req.query.reason, req.session.ClientId) : this.Server.DB.addPenalty({
                        TargetId: req.query.target,
                        OriginId: req.session.ClientId,
                        PenaltyType: 'PENALTY_PERMA_BAN',
                        Duration: 0,
                        Reason: req.query.reason
                    })
                    res.end(JSON.stringify({
                        success: true,
                        error: ''
                    }))
                break
                case 'COMMAND_CHANGE_INFO':
                    switch (true) {
                        case (!req.query.value):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Parameters missing'
                            }))
                        return
                    }

                    try { JSON.parse(req.query.value) }
                    catch (e) {
                        console.log(e)
                        res.end(JSON.stringify({
                            success: false,
                            error: 'Invalid format'
                        }))
                        return
                    }

                    config.Info = Buffer.from(JSON.parse(req.query.value).value, 'base64').toString()
                    fs.writeFile(configName, JSON.stringify(config, null, 4), (err) => {
                        if (err) {
                            console.log(err)
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Error occurred, view console for details'
                            }))
                            return
                        }
                        res.end(JSON.stringify({
                            success: true,
                            error: ''
                        }))
                    })
                break
                case 'COMMAND_SETROLE':

                break
                case 'COMMAND_KICK':
                    switch (true) {
                        case (!req.query.target || !req.query.reason):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Parameters missing'
                            }))
                        return
                        case (Client.PermissionLevel < inGame.PermissionLevel):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Forbidden'
                            }))
                        return
                        case (!inGame):
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Client not found'
                            }))
                        return
                    }
                    inGame && inGame.Kick(req.query.reason, req.session.ClientId)
                    res.end(JSON.stringify({
                        success: true,
                        error: ''
                    }))
                return
            }
        })
        this.app.get('/api/mod', async (req, res, next) => {
            switch (true) {
                case (!req.session.ClientId || !req.query.command):
                    res.status(401)
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Unauthorized'
                    }))

                return
            }

            var Client = await db.getClient(req.session.ClientId)

            switch (true) {
                case (Client.PermissionLevel < Permissions.Levels.ROLE_MODERATOR):
                    res.status(401)
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Unauthorized'
                    }))
                return
            }

            var lookup = {
                'COMMAND_NOT_FOUND' : 'Command not found, use ^3help^7 for a list of commands',
                'COMMAND_ARGUMENT_ERROR' : 'Not enough arguments supplied',
                'COMMAND_ENV_ERROR': 'This command can only be executed in-game'
            }

            var command = Buffer.from(req.query.command, 'base64').toString()
            console.log(command)

            if (command.startsWith(config.commandPrefix)) {
                var result = []

                var Player = {
                    Name: Client.Name,
                    ClientId: req.session.ClientId,
                    PermissionLevel : Client.PermissionLevel,
                    inGame: false,
                    Tell: (text) => {
                        result.push(text)
                    }
                }
                var end = () => {
                res.end(JSON.stringify({
                    success: true,
                    result: result
                }))
                }
                var args = command.substr(1).split(/\s+/)
                args[0] = args[0].toLocaleLowerCase()
                switch (true) {
                  case (!this.Managers[0].commands[args[0]]):
                    Player.Tell(lookup.COMMAND_NOT_FOUND)
                    end()
                    return
                  case (this.Managers[0].commands[args[0]].inGame || this.Managers[0].commands[args[0]].inGame == undefined):
                    Player.Tell(lookup.COMMAND_ENV_ERROR)
                    end()
                    return
                  case (Player.PermissionLevel < Permissions.Levels[this.Managers[0].commands[args[0]].Permission]):
                    Player.Tell(lookup.COMMAND_FORBIDDEN)
                    end()
                    return;
                  case (args.length - 1 < this.Managers[0].commands[args[0]].ArgumentLength):
                    Player.Tell(lookup.COMMAND_ARGUMENT_ERROR)
                    end()
                    return
        
                }
                await this.Managers[0].commands[args[0]].callback(Player, args, false)
                end()
            } else {
                switch (true) {
                    case (!req.session.ClientId):
                        res.status(403)
                        res.end()
                    return;
                    case ((await db.getClient(req.session.ClientId)).PermissionLevel < Permissions.Levels[Permissions.Commands.COMMAND_RCON]):
                        res.end(JSON.stringify({
                            success: false,
                            error: `You don't have access to the RCON, please use normal commands with the ^3${config.commandPrefix}^7 prefix`
                        }))
                    return
                    case (!this.Managers[req.query.ServerId]):
                        res.end(JSON.stringify({
                            success: false,
                            error: 'Server not found'
                        }))
                    return
                }
                var result = (await this.Managers[req.query.ServerId].Server.Rcon.executeCommandAsync(command)).trim().split('\n')
                result.length == 1 ? result[0] = 'Command executed successfully' : result = result.splice(1)
                res.end(JSON.stringify({
                    success: true,
                    result: result
                }))
            }
        })

        var escapeHtml = (text) => {
            var map = {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
          }

        this.app.post('/api/editprofile', async (req, res, next) => {
            switch (true) {
                case (!req.session.ClientId):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Not logged in'
                    }))
                return
                case (!req.body.description):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Parameters missing'
                    }))
                case (req.body.description.length > 1000):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Parameters too long'
                    }))
                return
            }
            req.body.description = req.body.description.length > 0 ? req.body.description : 'No info'
            await db.setClientField(req.session.ClientId, 'Description', req.body.description)
            res.end(JSON.stringify({
                success: true
            }))
        })

        var getClientWebStatus = (ClientId) => {
            var connectedClients = []
            this.socketClients.forEach( socketClient => {
                if (new Date() - new Date(socketClient.conn.heartbeat) < 5000) {
                    socketClient.conn.session.ClientId 
                    ? connectedClients.push({Client: socketClient.conn.session.ClientId, Heartbeat: socketClient.conn.heartbeat}) 
                    : connectedClients.push({Client: 'unknown', heartbeat: socketClient.conn.heartbeat})
                }
            })
            for (var i = 0; i < connectedClients.length; i++) {
                if (connectedClients[i].Client == ClientId) return true
            }
            return false
        }
        
        var getFlag = async (IPAddress) => {
            return (await (await fetch(`https://extreme-ip-lookup.com/json/${IPAddress}`)).json()).countryCode.toLocaleLowerCase()
        }

        this.app.get('/id/:id', async (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            var Client = await db.getClient(req.params.id)
            if (!Client) {
                res.setHeader('Content-type', 'text/html')
                res.status(404)
                ejs.renderFile(path.join(__dirname, '/html/error.ejs'), {header: header, error: {Code: 404, Description: 'Profile not found'}}, (err, str) => {
                    res.end(str)
                });
                return
            }

            Client.Role = getRoleFrom(Client.PermissionLevel, 1).Name
            Client.Stats = await db.getPlayerStatsTotal(Client.ClientId)
            Client.Meta = await db.getClientMeta(Client.ClientId)
            Client.InGame = await this.getClientStatus(Client.Guid)
            Client.WebStatus = getClientWebStatus(Client.ClientId)
            Client.Messages = await db.getMessages(Client.ClientId, 0, 50)
            Client.messageCount = (await db.getAllMessages(Client.ClientId)).length
            Client.Ban = await db.isBanned(Client.ClientId)
            Client.Flag = Client.IPAddress ? await getFlag(Client.IPAddress.split(':')[0]) : null
            Client.Status = {}

            switch (true) {
                case (!Client.InGame.Online && !Client.WebStatus):
                    Client.Status.String = 'OFFLINE'
                    Client.Status.Color = 'red'
                break
                case (!Client.InGame.Online && Client.WebStatus):
                    Client.Status.String = 'NOT-INGAME'
                    Client.Status.Color = 'yellow'
                break
                case (Client.InGame.Online):
                    Client.Status.String = 'INGAME'
                    Client.Status.Color = 'green'
                break
            }
            var self = req.session.ClientId ? await db.getClient(req.session.ClientId) : null
            ejs.renderFile(path.join(__dirname, '/html/client.ejs'), {self: self, Permissions: Permissions ,header: header, Client: Client, moment: moment}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/chat', async (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            var Messages = await db.getMessages(undefined, 0, 100)
            for (var i = 0; i < Messages.length; i++) {
                var Message = Messages[i]
                Message.Client = await db.getClient(Message.OriginId)
            }
            ejs.renderFile(path.join(__dirname, '/html/chat.ejs'), {header: header, Messages: Messages, moment: moment}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/api/players', async (req, res, next) => {
            if (!this.Managers[req.query.ServerId]) {
                res.end(JSON.stringify({
                    success: false,
                    error: 'Server not found'
                }))
                return
            }

            var servers = await this.getServers()
            var status = servers.find(x => x.ServerId == req.query.ServerId)

            res.end(JSON.stringify(status))
        })

        this.app.get('/api/socketclients', async (req, res, next) => {
            var connectedClients = []
            this.socketClients.forEach( async socketClient => {
                if (new Date() - new Date(socketClient.conn.heartbeat) < 3000) {
                    socketClient.conn.session.ClientId 
                    ? connectedClients.push({Client: socketClient.conn.session.ClientId, Heartbeat: socketClient.conn.heartbeat}) 
                    : connectedClients.push({Client: 'unknown', heartbeat: socketClient.conn.heartbeat})
                }
            })
            res.end(JSON.stringify(connectedClients))
        })
        this.app.set('view engine', 'jshtml')
        this.app.get('/search', async (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            var Clients = []
            var error = null
            if (req.query.q.length > 0) {
                Clients = await db.getClientByName(req.query.q)
                Clients.forEach(Client => {
                    Client.Role = getRoleFrom(Client.PermissionLevel, 1).Name
                })
                Clients.sort((a, b) => {
                    return new Date(b.Date) - new Date(a.Date)
                })
            } else {
                error = 'Please insert at least 1 character/s'
            }
            ejs.renderFile(path.join(__dirname, '/html/search.ejs'), {header: header, Clients: Clients, query: req.query.q, moment: moment, error: error}, (err, str) => {
                res.end(str)
            });
        })

        this.app.get('/api/servers', async (req, res, next) => {
            var Servers = await this.getServers()
            res.end(JSON.stringify(Servers))
        })

        this.app.get('/api/messages', async (req, res, next) => {
            var Messages = await db.getMessages(req.query.id, req.query.page, req.query.limit)
            for (var i = 0; i < Messages.length; i++) {
                if (Messages[i].Type == 'Message') continue
                Messages[i].Target = {
                    ClientId: Messages[i].Target.ClientId,
                    Name: Messages[i].Target.Name,
                }
                Messages[i].Origin = {
                    ClientId: Messages[i].Origin.ClientId,
                    Name: Messages[i].Origin.Name,
                }
            }
            res.end(JSON.stringify(Messages))
        })

        this.app.get('*', (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            res.status(404)
            ejs.renderFile(path.join(__dirname, '/html/error.ejs'), {header: header, error: {Code: 404, Description: lookup.errors[404]}}, (err, str) => {
                res.end(str)
            });
        })

        setInterval(this.UpdateClientHistory.bind(this), this.pollRate)
    }
    UpdateClientHistory() {
        this.Managers.forEach(async Manager => {
            if (!Manager.Server.Rcon.isRunning) return
            var status = await Manager.Server.Rcon.getStatus()
            if (!status) return
            Manager.Server.clientHistory.push({x: new Date(), y: status.data.clients.length})
            if (Manager.Server.clientHistory.length > 300) Manager.Server.clientHistory.shift()
        })
    }
    Socket(socket) {
        var getParams = (url) => {
            var queryDict = {}
            url.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})
            return queryDict;
        }
        socket.on('connection', async (conn, req) => {
            conn.heartbeat = new Date()
            this.sessionParser(req, {}, () => {
                setTimeout(() => {
                    conn.send(JSON.stringify({
                        event: 'socket_response'
                    }))
                }, 0);
                conn.session = req.session
                var params = getParams(req.url.substr(1))
                if (params.action) {
                    switch (params.action) {
                        case 'socket_listen_servers':
                            var index = this.socketClients.push({ action:'socket_listen_servers', conn: conn }) - 1
                            conn.resourceID = index
                        break
                        case 'socket_listen_messages':
                            var index = this.socketClients.push({ action:'socket_listen_messages', conn: conn }) - 1
                            conn.resourceID = index
                        break
                        default:
                            var index = this.socketClients.push({ action: null, conn: conn }) - 1
                            conn.resourceID = index
                        break
                    }
                } else {
                    var index = this.socketClients.push({ action: null, conn: conn }) - 1
                    conn.resourceID = index
                }
                conn.on('message', (msg) => {
                    try {
                        this.socketClients[conn.resourceID].conn.heartbeat = new Date()
                    }
                    catch (e){}
                })
            })
        })

        this.Broadcast = (msg) => {
            this.socketClients.forEach(client => {
                client.send(JSON.stringify(msg))
            })
        }

        var logActivity = (Manager, Activity) => {
            Manager.Server.clientActivity.push(Activity)
            Manager.Server.clientActivity.length > 50 &&  Manager.Server.clientActivity.shift()
        }

        var sendToAction = (action, message) => {
            this.socketClients.forEach(client => {
                if (client.action == action) {
                    client.conn.send(JSON.stringify(message))
                }
            })
        }

        var i = 0; this.Managers.forEach(Manager => {
            var id = i++
            Manager.Server.on('reload', async () => {
                sendToAction('socket_listen_servers', {
                    event: 'event_server_reload',
                        data: {
                            ServerId: id,
                        }
                })
            })
            Manager.Server.on('connect', async ePlayer => {
                logActivity(Manager, {event: 'event_client_connect', data: { ServerId: id, Client: { Name: ePlayer.Name, ClientId: ePlayer.ClientId, Clientslot: ePlayer.Clientslot } } })
                sendToAction('socket_listen_servers', {
                    event: 'event_client_connect',
                        data: {
                            ServerId: id,
                            Client: {
                                Name: ePlayer.Name,
                                ClientId: ePlayer.ClientId
                            }
                        }
                })
            })
            Manager.Server.on('disconnect', async ePlayer => {
                logActivity(Manager, {event: 'event_client_disconnect', data: { ServerId: id, Client: { Name: ePlayer.Name, ClientId: ePlayer.ClientId, Clientslot: ePlayer.Clientslot } } })
                sendToAction('socket_listen_servers', {
                    event: 'event_client_disconnect',
                        data: {
                            ServerId: id,
                            Client: {
                                Name: ePlayer.Name,
                                ClientId: ePlayer.ClientId
                            }
                        }
                })
            })
            Manager.Server.on('message', (ePlayer, Message) => {
                logActivity(Manager, {event: 'event_client_message', data: { ServerId: id, Client: { Name: ePlayer.Name, ClientId: ePlayer.ClientId, Clientslot: ePlayer.Clientslot }, Message} })
                sendToAction('socket_listen_servers', {
                    event: 'event_client_message',
                    data: {
                        ServerId: id,
                        Message: Message,
                        Client: {
                            Name: ePlayer.Name,
                            ClientId: ePlayer.ClientId
                        }
                    }
                })
                sendToAction('socket_listen_messages', {
                    event: 'event_client_message',
                    ServerId: id,
                    Message: Message,
                    Client: {
                        Name: ePlayer.Name,
                        ClientId: ePlayer.ClientId
                    }
                })
            })
        })
    }
    async getServers() {
        var Servers = []

        for (var i = 0; i < this.Managers.length; i++) {
            var Manager = this.Managers[i]
            var ePlayers = Manager.Server.Clients
            var Clients = []

            ePlayers.forEach(ePlayer => {
                if (!ePlayer) return
                Clients.push({
                    Name: ePlayer.Name,
                    ClientId: ePlayer.ClientId,
                    Clientslot: ePlayer.Clientslot
                })
            })

            if (!Manager.Server.Rcon.isRunning || !Manager.Server.Mapname) {
                var status = Manager.Server.previousStatus
                if (!status) continue
                status.Online = false
                Manager.Server.previousStatus = status
                Servers.push(status)
                continue
            }

            var Dvars = {
                Map: Manager.Server.Mapname,
                MaxClients: Manager.Server.MaxClients,
                Hostname: Manager.Server.HostnameRaw,
            }
            var Status = {
                ServerId: i,
                Online: true,
                Uptime: Manager.Server.uptime,
                clientActivity: Manager.Server.clientActivity,
                clientHistory: Manager.Server.clientHistory,
                IP: Manager.Server.IP,
                PORT: Manager.Server.PORT,
                Dvars: Dvars,
                Clients: Clients
            }
            Manager.Server.previousStatus = Status
            Servers.push(Status)
        }
        Servers.sort((a, b) => {
            return b.Clients.length - a.Clients.length;
        })
        return Servers

    }
}

module.exports = Webfront