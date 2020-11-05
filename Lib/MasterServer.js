const ws             = require('ws')
const https          = require('https')
const { machineId }  = require('node-machine-id')
const Utils          = new (require('../Utils/Utils.js'))()

class MasterServer {
    constructor(Managers) {
        this.Managers = Managers
        this.interval = 60 * 1000 * 1
        this.hostname = 'master.fed0001.xyz'
    }
    async init() {
        this.DB = this.Managers[0].Server.DB

        this.apikey = await this.getApiKey()

        this.connect()
    }
    async connect() {
        var master = new ws(`wss://${this.hostname}?key=${this.apikey}`)

        var interval = null
        var ping = null

        master.onopen = async () => {
            console.log(`Connected to master server \x1b[32m${this.hostname}\x1b[0m`)

            interval = setInterval(() => {
                try {
                    this.heartbeat(master)
                }
                catch (e) {
                    console.log(e)
                }
            }, this.interval)

            ping = setInterval(() => {
                master.send()
            }, 5000)
        }

        master.onerror = async (e) => {
            master.close()
        }

        master.onclose = async (e) => {
            clearInterval(interval)
            clearInterval(ping)

            console.log('Connection to master server lost, reconnecting...')

            setTimeout(() => {
                this.connect(this.hostname, this.apikey)
            }, 5000)
        }

        master.onmessage = async (msg) => {
            try {
                if (!Utils.isJson(msg)) {
                    switch (msg) {

                    }

                    return
                }

                var event = JSON.parse(msg)

                switch (event.type) {
                    case 'broadcast':
                        this.Managers.forEach(Manager => {
                            Manager.Server.Broadcast(event.message)
                        })
                    break
                }
            }
            catch (e) {}
        }
    }
    async makeRequest(method, hostname, path, port, data) {
        return new Promise((resolve, reject) => {
            let options = {
                host: hostname,
                port: port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
            const req = https.request(options, res => {
                res.on('data', data => {
                    resolve(data.toString())
                })
            })

            req.on('error', error => {
                reject(error)
            })

            req.write(JSON.stringify(data))
            req.end()
        })
    }

    async getApiKey() {
        let id  = await machineId()
        let endpoint = '/api/key'
        let key = JSON.parse(await this.makeRequest('POST', this.hostname, endpoint, 443, {action: 'get', id }))

        return key.key
    }

    heartbeat(webSocket) {
        var servers = []
        this.Managers.filter(Manager => Manager.Server.Rcon.isRunning).forEach(Manager => {
            if (!Manager.Server.Rcon.isRunning) return

            var server = {}
            var clients = []
            Manager.Server.Clients.forEach(Client => {
                if (!Client) return
                clients.push({
                    name: Client.Name,
                    guid: Client.Guid
                })
            })

            server.dvars = {
                mapname: Manager.Server.Mapname,
                gametype: Manager.Server.Gametype,
                gamename: Manager.Server.Gamename,
                hostname: Manager.Server.HostnameRaw,
                maxclients: Manager.Server.MaxClients
            }

            server.ip = Manager.Server.externalIP
            server.port = Manager.Server.PORT
            server.clients = clients

            servers.push(server)
        })

        var heartbeat = { type: 'heartbeat', servers }

        servers.length && webSocket.send(JSON.stringify(heartbeat))
    }
}

module.exports = MasterServer