const dgram             = require('dgram')
const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Mutex             = require(path.join(__dirname, '../Utils/Mutex.js'))
const fs                = require('fs')
const wait              = require('delay')
const EventEmitter      = require('events')

class Rcon {
    constructor (ip, port, password, gamename) {
        this.ip = ip
        this.mutex = new Mutex()
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
        return new Promise(async (_resolve, reject) => {
            if (this.commandPrefixes.Rcon.commandDelay) {
                await this.mutex.lock()
            }

            const resolve = async (msg) => {
                _resolve(msg)

                if (this.commandPrefixes.Rcon.commandDelay) {
                    await wait(this.commandPrefixes.Rcon.commandDelay)
                    this.mutex.unlock()
                }
            }

            const client =  dgram.createSocket('udp4')

            const message = new Buffer.from(Utils.formatString(this.commandPrefixes.Rcon.prefix, {
                password: this.password,
                command
            })[0], 'binary')

            const timeout = setTimeout(() => {
                client.close()
                client.removeAllListeners()

                resolve(false)
            }, 5000)

            client.once('listening', async () => {
                client.send(message, 0, message.length, this.port, this.ip, async (err) => {
                    if (err) {
                        clearTimeout(timeout)
                        client.close()
                        client.removeAllListeners()

                        resolve(false)
                    }
                })
            })

            client.once('message', (data) => {
                clearTimeout(timeout)
                client.close()

                resolve(data.toString())
            })

            client.bind()
        })
    }

    async setDvar(dvar, value) {
        const command = Utils.formatString(this.commandPrefixes.Rcon.setDvar, {
            dvar,
            value
        })

        await this.executeCommandAsync(command)
    }

    async getDvarRaw(dvarName) {
        for (var i = 0; i < this.commandRetries; i++) {
            var dvar = await this.executeCommandAsync(this.commandPrefixes.Rcon.getDvar.replace('%DVAR%', dvarName))

            if (!dvar || !dvar.match(this.commandPrefixes.Rcon.dvarRegex)) continue
            return this.commandPrefixes.Rcon.dvarRegex.exec(dvar)[3].trim()
        }

        return false
    }

    async getDvar(dvar) {
        const command = Utils.formatString(this.commandPrefixes.Rcon.getDvar, {
            dvar
        })

        for (var i = 0; i < this.commandRetries; i++) {
            const string = await this.executeCommandAsync(command)

            if (!string || !string.match(this.commandPrefixes.Rcon.dvarRegex)) {
                continue
            }

            return Utils.stripString(this.commandPrefixes.Rcon.dvarRegex.exec(string)[3].trim())
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

                clients.push(this.commandPrefixes.Rcon.parseStatus(match))
            })
        }
        catch (e) {
            return false
        }

        return {success: true, data : {map, clients}}
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