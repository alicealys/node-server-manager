const express   = require('express')
const jshtml    = require('jshtml')
const path      = require('path')
const fs        = require('fs')
const session   = require('express-session')
const ejs       = require('ejs')
const moment    = require('moment')
const bodyParser= require('body-parser')
const bcrypt    = require('bcrypt')
const ws        = require('ws')
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Utils     = require(path.join(__dirname, '../Utils/Utils.js'))
const https     = require('https')
const { Server } = require('http')
const rateLimit = require("express-rate-limit")
const { hostname } = require('os')
const { connect } = require('http2')
const Database  = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()

const ssl = {
    key: fs.readFileSync('/etc/ssl/private/private.key'),
    cert: fs.readFileSync('/etc/ssl/certs/certificate.crt'),
}

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
    constructor(Managers) {
        this.Managers = Managers
        this.pollRate = 300000
        this.socketClients = []
        this.Start()
    }
    async getClientStatus(Guid) {
        var Status = {}
        for (var o = 0; o < this.Managers.length; o++) {
            var Manager = this.Managers[o]
            var status = await Manager.Server.Rcon.getStatus()
            for (var i = 0; i < status.data.clients.length; i++) {
                var client = status.data.clients[i]
                if (client.guid == Guid) {
                    Status.Online = true
                    Status.Hostname = await Manager.Server.Rcon.getDvar('sv_hostname')
                    break
                }
            }
        }
        return Status;
    }
    Start() {
        this.app = express()

        const server = https.createServer(ssl, this.app)
        const socket = new ws.Server({ server: server });

        server.listen(8001)
        
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
        
        this.app.use('/auth/*', apiLimiter)


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
            var Client = null
            if (req.session.ClientId) {
                Client = await db.getClient(req.session.ClientId)
            }
            ejs.renderFile(path.join(__dirname, '/html/header.ejs'), {session: req.session, Permissions: Permissions, Client: Client}, (err, str) => {
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

            // If the Client does NOT have a password
            if (!passwordHash) {
                bcrypt.compare(req.body.previous, tokenHash, (err, same) => {
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
                bcrypt.compare(req.body.previous, tokenHash.Token, function(err, result) {
                    if (!result) {
                        bcrypt.compare(req.body.previous, passwordHash, (err, same) => {
                            console.log('password auth failed')
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
            }
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
                if (new Date() - new Date(socketClient.conn.heartbeat) < 3000) {
                    socketClient.conn.session.ClientId 
                    ? connectedClients.push({Client: socketClient.conn.session.ClientId, Heartbeat: socketClient.conn.heartbeat}) 
                    : connectedClients.push({Client: 'unknown', heartbeat: socketClient.conn.heartbeat})
                }
            })
            for (var i = 0; i < connectedClients.length; i++) {
                console.log(connectedClients)
                if (connectedClients[i].Client == ClientId) return true
            }
            return false
        }

        this.app.get('/id/:id', async (req, res, next) => {
            res.setHeader('Content-type', 'text/html')
            var Client = await db.getClient(req.params.id)
            if (Client) {
                Client.Role = getRoleFrom(Client.PermissionLevel, 1).Name
                Client.Stats = await db.getPlayerStatsTotal(Client.ClientId)
                Client.Meta = await db.getClientMeta(Client.ClientId)
                Client.InGame = await this.getClientStatus(Client.Guid)
                Client.WebStatus = getClientWebStatus(Client.ClientId)
                Client.Messages = await db.getMessages(Client.ClientId, 0, 50)
                Client.messageCount = (await db.getAllMessages(Client.ClientId)).length
            }
            Client.Status = {}
            console.log(Client.WebStatus)
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
            console.log(self)
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
            var status = (await this.getServers())[req.query.ServerId]

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

        this.app.get('/api/rcon', async (req, res, next) => {
            switch (true) {
                case (!req.session.ClientId):
                    res.status(403)
                    res.end()
                return;
                case ((await db.getClient(req.session.ClientId)).PermissionLevel < Permissions.Levels[Permissions.Commands.COMMAND_RCON]):
                    res.status(403)
                    res.end()
                return
                case (!this.Managers[req.query.ServerId]):
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Server not found'
                    }))
                return
            }
            var result = (await this.Managers[req.query.ServerId].Server.Rcon.executeCommandAsync(req.query.command)).trim().split('\n')
            result.length == 1 ? result[0] = 'Command executed successfully' : result = result.splice(1)
            res.end(JSON.stringify({
                success: true,
                result: result
            }))
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
            Manager.Server.clientHistory.push({x: new Date(), y: (await Manager.Server.Rcon.getStatus()).data.clients.length})
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
                conn.on('message', (msg) => {
                    msg = JSON.parse(msg)
                    switch (msg.action) {
                        case 'heartbeat':
                            this.socketClients[conn.resourceID].conn.heartbeat = new Date()
                        break
                    }
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
            var Map = await Manager.Server.Rcon.getDvar('mapname')

            if (!Map) {
                console.log(`Could not communicate with ${Manager.Server.IP}:${Manager.Server.PORT}`)
                Servers.push(Manager.Server.previousStatus)
                continue
            }

            var Clients = []

            ePlayers.forEach(ePlayer => {
                if (!ePlayer) return
                Clients.push({
                    Name: ePlayer.Name,
                    ClientId: ePlayer.ClientId,
                    Clientslot: ePlayer.Clientslot
                })
            })

            var Dvars = {
                Map: Map,
                MaxClients: await Manager.Server.Rcon.getDvar('sv_maxclients'),
                Hostname: await Manager.Server.Rcon.getDvar('sv_hostname'),
            }
            var Status = {
                ServerId: i,
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

        return Servers

    }
}

module.exports = Webfront