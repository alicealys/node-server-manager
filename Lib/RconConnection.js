const dgram             = require('dgram')
const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const fs                = require('fs')
const wait              = require('delay')
const EventEmitter      = require('events')

const waittill = async (object, event, value) => {
    return new Promise(async (resolve, reject) => {
        const callback = (v) => {
            if (v == value) {
                resolve()
                object.removeListener(event, callback)
            }
        }

        object.on(event, callback)
    })
}

const eventEmitter = new EventEmitter()

class Rcon {
    constructor (ip, port, password, gamename) {
        this.ip = ip
        this.port = port
        this.password = password
        this.gamename = gamename
        this.commandPrefixes = fs.existsSync(path.join(__dirname, `./RconCommandPrefixes/${gamename}.js`)) 
            ? {...require(`./RconCommandPrefixes/Default.js`), ...require(`./RconCommandPrefixes/${gamename}.js`)} 
            : require(`./RconCommandPrefixes/Default.js`)
            
        this.isRunning = false
        this.commandRetries = 3
        this.previousClients = []
        this.canExecute = true
        this.commandQueue = 0
        this.client = dgram.createSocket('udp4')
    }
    async sendCommand(command) {
        return new Promise(async (resolve, reject) => {
            var client =  dgram.createSocket('udp4')
            var message = new Buffer.from(command, 'binary')

            client.on('listening', async () => {
                client.send(message, 0, message.length, this.port, this.ip, async (err) => {
                    if (err) {
                        client.close()
                        resolved = true
                        resolve(false)
                    }
                })
            })

            client.bind()

            var resolved = false;
            var onMessage = (msg) => {
                client.removeAllListeners()
                client.close()
                resolved = true
                resolve(msg.toString())
            }

            client.on('message', onMessage);

            setTimeout(() => {
                if (!resolved) {
                    client.removeAllListeners()
                    client.close()
                    resolve(false)
                }
            }, 3000)
        })
    }
    async executeCommandAsync(command) {
        if (this.canExecute) {
            this.commandQueue = 0
        }

        return new Promise(async (resolve, reject) => {
            const index = ++this.commandQueue

            const _resolve = async (a) => {
                resolve(a)
                
                if (this.commandPrefixes.Rcon.commandDelay) {
                    await wait(this.commandPrefixes.Rcon.commandDelay)
                    this.canExecute = true
                    eventEmitter.emit('command_done', index + 1)
                }
            }

            if (!this.canExecute && this.commandPrefixes.Rcon.commandDelay) {
                await waittill(eventEmitter, 'command_done', index)
            }

            this.canExecute = false

            var client =  dgram.createSocket('udp4')
            var message = new Buffer.from(this.commandPrefixes.Rcon.prefix
                .replace('%PASSWORD%', this.password)
                .replace('%COMMAND%', command), 'binary')

            client.on('listening', async () => {
                client.send(message, 0, message.length, this.port, this.ip, async (err) => {
                    if (err) {
                        client.close()
                        resolved = true
                        _resolve(false)
                    }
                })
            })

            client.bind()

            var resolved = false;
            var onMessage = (msg) => {
                client.close()
                client.removeAllListeners()
                resolved = true

                _resolve(msg.toString())
            }

            client.on('message', onMessage)

            setTimeout(() => {
                if (!resolved) {
                    client.close()
                    client.removeAllListeners()
                    _resolve(false)
                }
            }, 5000)
        })
    }
    async setDvar(dvarName, value) {
        await this.executeCommandAsync(this.commandPrefixes.Rcon.setDvar.replace('%DVAR%', dvarName).replace('%VALUE%', value))
    }
    async getDvarRaw(dvarName) {
        for (var i = 0; i < this.commandRetries; i++) {
            var dvar = await this.executeCommandAsync(this.commandPrefixes.Rcon.getDvar.replace('%DVAR%', dvarName))

            if (!dvar || !dvar.match(this.commandPrefixes.Rcon.dvarRegex)) continue
            return this.commandPrefixes.Rcon.dvarRegex.exec(dvar)[3].trim()
        }
        return false
    }
    async getDvar(dvarName) {
        for (var i = 0; i < this.commandRetries; i++) {
            var dvar = await this.executeCommandAsync(this.commandPrefixes.Rcon.getDvar.replace('%DVAR%', dvarName))

            if (!dvar || !dvar.match(this.commandPrefixes.Rcon.dvarRegex)) continue
            return Utils.stripString(this.commandPrefixes.Rcon.dvarRegex.exec(dvar)[3].trim())
        }
        return false
    }
    async getStatus() {
        try {
            var status = await this.executeCommandAsync(this.commandPrefixes.Rcon.status)

            if (!status) return false
            status = status.split('\n').slice(1, -1)

            if (status[0].includes('invalid')) return false

            var map = status[0].split(/\s+/g)[1]
            var rawClients = status.slice(3)
            var clients = []

            rawClients.forEach(client => {
                if (!client.match(this.commandPrefixes.Rcon.statusRegex)) return
                var match = this.commandPrefixes.Rcon.statusRegex.exec(client)

                for (var i = 0; i < match.length; i++) {
                    match[i] = match[i] ? match[i].trim() : ''
                }

                clients.push(this.commandPrefixes.Rcon.parseStatus(match, Utils, this.gamename))
            })
        }
        catch (e) {
            return false
        }

        return {success: true, data : { map, clients }}
    }
    async getClients() {
        var status = await this.executeCommandAsync(this.commandPrefixes.Rcon.status)
        if (!status) return this.previousClients

        status = status.trim().split('\n').slice(4).map(x => x.trim().split(/\s+/))

        var clients = new Array(18).fill(null)

        for (var i = 0; i < status.length; i++) {
            var client = {
                Clientslot: status[i][0],
                Name: status[i][5],
                Guid: status[i][4],
                IPAddress: status[i][7]
            }

            clients[client.Clientslot] = client
        }
        
        this.previousClients = clients
        return clients
    }
    async getClientByGuid(guid) {
        var clients = (await this.getStatus()).data.clients

        for (var i = 0; i < clients.length; i++) {
            if (clients[i].guid == guid) {
                return clients[i]
            }
        } 
    }
}

module.exports = Rcon