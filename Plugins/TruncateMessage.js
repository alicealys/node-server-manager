const wait              = require('delay')

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.Server.on('connect', this.onPlayerConnect.bind(this))
  }
  async onPlayerConnect(Player) {
    Player.on('message', async (Message) => {
        if (Message.length > this.Server.Rcon.commandPrefixes.Dvars.messagelength) {
            var truncatedMessage = this.chunkString(Message, this.Server.Rcon.commandPrefixes.Dvars.messagelength)
            for (var i = 1; i < truncatedMessage.length; i++) {
                this.Server.Broadcast(truncatedMessage[i])
                await wait(100)
            }

        }
    })
  }
  chunkString(str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
  }
}
module.exports = Plugin