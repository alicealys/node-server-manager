const path = require('path');

class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    this.init()
  }
  async playerConnected (Player) {
    Player.on('death', async (Attacker, Attack) => {

      this.Server.DB.incrementStat(Player.ClientId, 1, 'Deaths')
      this.Server.DB.incrementStat(Attacker.ClientId, 1, 'Kills')

      var PlayerStats = await this.Server.DB.getPlayerStatsTotal(Player.ClientId)
      var AttackerStats = await this.Server.DB.getPlayerStatsTotal(Attacker.ClientId)

      this.Server.DB.incrementStat(Player.ClientId, (AttackerStats.Performance - 400) / (PlayerStats.Kills + AttackerStats.Deaths), 'Performance')
      this.Server.DB.incrementStat(Attacker.ClientId, (PlayerStats.Performance + 400) / (AttackerStats.Kills + AttackerStats.Deaths), 'Performance')

    })
    Player.on('message', async (Message) => {
      await this.Server.DB.logMessage(Player.ClientId, Message)
    })
  }
  init () {
      this.Server.on('connect', this.playerConnected.bind(this))
      this.playedTimeLogger()
  }
  playedTimeLogger() {
    setInterval(async () => {
      if (!this.Server.Rcon.isRunning) return
      var status = await this.Server.Rcon.getStatus()
      if (!status) return
      status.data.clients.forEach(async client => {
        var ClientId = await this.Server.DB.getClientId(client.guid)
        this.Server.DB.incrementStat(ClientId, 1, 'PlayedTime')
      })
    }, 60000)
  }
}

module.exports = Plugin