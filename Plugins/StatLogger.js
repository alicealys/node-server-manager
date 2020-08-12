const path = require('path');

class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    this.init()
  }
  async playerConnected (Player) {
    Player.on("kill", async (Victim, Attack) => {
      
      this.Server.DB.getMostUsedWeapon(Player.ClientId)

      await this.Server.DB.logKill(Player.ClientId, Victim.ClientId, Attack)

      this.Server.DB.incrementStat(Player.ClientId, 1, 'Kills')

      var PlayerStats = await this.Server.DB.getPlayerStatsTotal(Player.ClientId)
      this.Server.DB.editStat(Player.ClientId, this.calculatePerformance(PlayerStats.Kills, PlayerStats.Deaths, PlayerStats.PlayedTime), 'Performance')
    })
    Player.on('death', async (Attacker, Attack) => {

      this.Server.DB.incrementStat(Player.ClientId, 1, 'Deaths')

      var PlayerStats = await this.Server.DB.getPlayerStatsTotal(Player.ClientId)
      this.Server.DB.editStat(Player.ClientId, this.calculatePerformance(PlayerStats.Kills, PlayerStats.Deaths, PlayerStats.PlayedTime), 'Performance')
    })
    Player.on('message', async (Message) => {
      await this.Server.DB.logMessage(Player.ClientId, Message)
    })
  }
  calculatePerformance (k, d, t) {
    //  (kdr / playedtime) * 100
    return ( ( Math.max(k, 1) / Math.max(d, 1) ) / ( Math.max(t, 1) / 10 ) ) * 100
  }
  init () {
      this.Server.on('connect', this.playerConnected.bind(this))
      this.playedTimeLogger()
  }
  playedTimeLogger() {
    setInterval(async () => {
      var status = await this.Server.Rcon.getStatus()
      status.data.clients.forEach(async client => {
        var ClientId = await this.Server.DB.getClientId(client.guid)
        this.Server.DB.incrementStat(ClientId, 1, 'PlayedTime')
      })
    }, 60000)
  }
}

module.exports = Plugin