const dgram = require('dgram');
class Rcon {
    constructor (ip, port, password) {
      this.ip = ip;
      this.port = port;
      this.password = password;
      this.isRunning = true
      this.previousClients = []
      this.client = dgram.createSocket('udp4')
    }
    async executeCommandAsync(command) {
      return new Promise(async (resolve, reject) => {
        var client =  dgram.createSocket('udp4')
        var message = new Buffer.from(`\xff\xff\xff\xffrcon ${this.password} ${command}`, 'binary');
        client.send(message, 0, message.length, this.port, this.ip);
        var resolved = false;
        var onMessage = (msg) => {
            client.removeAllListeners()
            resolve(msg.toString())
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
        var dvar = await this.executeCommandAsync(`get ${dvar}`)
        if (!dvar) return false
        return dvar.match(/"(.*?)"/g)[0].slice(1, -1)
    }
    async getStatus() {
      var status = await this.executeCommandAsync('status')
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
      var indexes = status[1].split(/\s+/)
      var columns = status[2].split(' ').map(x => x.length)
      var clients = []
      rawClients.forEach(client => {
        var clientVars = []
        client = client.split('')
        columns.forEach(column => {
          clientVars.push(client.splice(0, column + 1).join('').trim())
        })
        clients.push(clientVars.reduce((a, key, index) => Object.assign(a, { [indexes[index]] : key }), {}));
      })
      return {success: true, data : { map, clients }}
    }
    async getClients() {
      var status = await this.executeCommandAsync('status');
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
    async getClientByName(name) {
      var clients = await this.getClients();
      for (var i = 0; i < clients.length; i++) {
        if (clients[i] == null) continue;
        if (clients[i].Name == name) {
          return clients[i];
        }
      } 
    }
}
module.exports = Rcon
