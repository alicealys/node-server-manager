const dgram             = require('dgram');
const path              = require('path')
const commandPrefixes   = require('./RconCommandPrefixes')
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils();

class Rcon {
    constructor (ip, port, password) {
      this.ip = ip
      this.port = port
      this.password = password
      this.commandPrefixes = commandPrefixes
      this.isRunning = true
      this.previousClients = []
      this.client = dgram.createSocket('udp4')
    }
    async executeCommandAsync(command) {
      return new Promise(async (resolve, reject) => {
        var client =  dgram.createSocket('udp4')
        var message = new Buffer.from(this.commandPrefixes.Rcon.prefix
                                      .replace('%PASSWORD%', this.password)
                                      .replace('%COMMAND%', command)
                                      , 'binary')

        try {
          client.on('listening', () => {
            client.send(message, 0, message.length, this.port, this.ip, (err) => {
              if (err) {
                client.close()
                resolved = true
                resolve(false)
              }
            })
          })
        }
        catch (e) {
          console.log(`Error sending udp packet: ${e.toString()}`)
          resolve(false)
        }

        client.bind()

        var resolved = false;
        var onMessage = (msg) => {
            client.removeAllListeners()
            resolve(msg.toString())
            client.close()
            resolved = true
        }
        client.on('message', onMessage);

        setTimeout(() => {
          if (!resolved) {
            client.removeAllListeners()
            resolve(false)
          }
        }, 5000)
      });
    }
    async getDvar(dvar) {
        var dvar = await this.executeCommandAsync(this.commandPrefixes.Rcon.getDvar.replace('%DVAR%', dvar))
        if (!dvar) return false
        return dvar.match(/"(.*?)"/g)[0].slice(1, -1)
    }
    async getStatus() {
      var status = await this.executeCommandAsync(this.commandPrefixes.Rcon.status)
      if (!status) return false
      status = status.split('\n').slice(1, -1)
      switch (true) {
        case (status[0].includes('invalid')):
          return {success: false, error: status[0]}
        case (!status):
          return {success: false, error: ''}
      }
      var map = status[0].split(/\s+/g)[1]
      var rawClients = status.slice(3)
      var clients = []
      /*var indexes = status[1].split(/\s+/)
      var columns = status[2].split(' ').map(x => x.length)

      rawClients.forEach(client => {
        var clientVars = []
        client = client.split('')
        columns.forEach(column => {
          clientVars.push(client.splice(0, column + 1).join('').trim())
        })
        clients.push(clientVars.reduce((a, key, index) => Object.assign(a, { [indexes[index]] : key }), {}));
      })*/
      var gamename = await this.getDvar('gamename')
      rawClients.forEach(client => {
        /*var end = client.match(/\b([0-9])\s+(unknown|bot|((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:(?<!\.)\b|\.)){4})/g)[0]

        // split line until the end of the client name
        client = client.substr(0, client.indexOf(end)).trim()
        var meta = client.split(/\s+/g, 5) // num, bot, guid ... 
        var name = client.split(/\s+/g).slice(meta.length).join(' ').replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``) // client name
        var parsedClient = {
          name: name,
          guid: Utils.convertGuid(meta[4], gamename),
          num: meta[0],
          ping: meta[3],
          bot: meta[2],
          score: meta[1],
          lastmsg: end.split(/\s+/g)[0],
          address: end.split(/\s+/g)[1]
        }*/
        clients.push(Utils.parseStatusLine(client))
      })
      return {success: true, data : { map, clients }}
    }
    async getClients() {
      var status = await this.executeCommandAsync(this.commandPrefixes.Rcon.status);
      if (!status) return this.previousClients
      status = status.trim().split('\n').slice(4).map(x => x.trim().split(/\s+/));
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
      return clients;
    }
    async getClientByGuid(guid) {
      var clients = (await this.getStatus()).data.clients;
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].guid == guid) {
          return clients[i]
        }
      } 
    }
}
module.exports = Rcon
