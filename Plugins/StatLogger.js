const path = require('path')
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))

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

      this.Server.DB.incrementStat(Player.ClientId, (AttackerStats.Performance - 400), 'TotalPerformance')
      this.Server.DB.incrementStat(Attacker.ClientId, (PlayerStats.Performance + 400), 'TotalPerformance')

      this.Server.DB.editStat(Player.ClientId, (PlayerStats.TotalPerformance + (AttackerStats.Performance - 400)) / (PlayerStats.Kills + PlayerStats.Deaths), 'Performance')
      this.Server.DB.editStat(Attacker.ClientId, (AttackerStats.TotalPerformance + (PlayerStats.Performance + 400)) / (AttackerStats.Kills + AttackerStats.Deaths), 'Performance')

    })
    Player.on('message', async (Message) => {
      if (Message.startsWith(config.commandPrefix)) return
      await this.Server.DB.logMessage(Player.ClientId, Player.Name, Player.Server.HostnameRaw, Message)
    })
  }
  init () {
      this.Server.on('connect', this.playerConnected.bind(this))
      this.playedTimeLogger()
  }
  playedTimeLogger() {
    setInterval(async () => {
      if (!this.Server.Rcon.isRunning) return
      this.Server.Clients.forEach(async Client => {
        if (!Client) return
        this.Server.DB.incrementStat(Client.ClientId, (new Date() - Client.lastSeen) / 1000 / 60, 'PlayedTime')
        Client.lastSeen = new Date()
        var Stats = await this.Server.DB.getPlayerStatsTotal(Client.ClientId)
        this.Server.DB.addStatRecord(Client.ClientId, Stats.TotalPerformance, Math.max(0, Stats.Performance))
      })
    }, 60000)
  }
}

module.exports = Plugin