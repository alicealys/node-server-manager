const path = require('path')
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))

class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    this.Buffer = { Stats: {}, previousStats: {} }
    setInterval(this.updateStats.bind(this), 300 * 1000)
    this.init()
  }
  async playerConnected (Player) {
    Player.on('death', async (Attacker, Attack) => {

      this.Server.DB.logKill(Attacker.ClientId, Player.ClientId, Attack)

      this.Buffer.Stats[Player.ClientId] = this.Buffer.Stats[Player.ClientId] ? this.Buffer.Stats[Player.ClientId] : await this.Server.DB.getPlayerStatsTotal(Player.ClientId)
      this.Buffer.Stats[Attacker.ClientId] = this.Buffer.Stats[Attacker.ClientId] ? this.Buffer.Stats[Attacker.ClientId] : await this.Server.DB.getPlayerStatsTotal(Attacker.ClientId)

      this.Buffer.Stats[Attacker.ClientId].Kills++
      this.Buffer.Stats[Player.ClientId].Deaths++

      this.Buffer.Stats[Player.ClientId].TotalPerformance += this.Buffer.Stats[Attacker.ClientId].Performance - 400
      this.Buffer.Stats[Attacker.ClientId].TotalPerformance += this.Buffer.Stats[Player.ClientId].Performance + 400

      //this.Server.DB.incrementStat(Player.ClientId, (AttackerStats.Performance - 400), 'TotalPerformance')
      //this.Server.DB.incrementStat(Attacker.ClientId, (PlayerStats.Performance + 400), 'TotalPerformance')

      this.Buffer.Stats[Player.ClientId].Performance = (this.Buffer.Stats[Player.ClientId].TotalPerformance + (this.Buffer.Stats[Attacker.ClientId].Performance - 400)) / (this.Buffer.Stats[Player.ClientId].Kills + this.Buffer.Stats[Player.ClientId].Deaths)
      this.Buffer.Stats[Attacker.ClientId].Performance = (this.Buffer.Stats[Attacker.ClientId].TotalPerformance + (this.Buffer.Stats[Player.ClientId].Performance + 400)) / (this.Buffer.Stats[Attacker.ClientId].Kills + this.Buffer.Stats[Attacker.ClientId].Deaths)

      //this.Server.DB.editStat(Player.ClientId, (PlayerStats.TotalPerformance + (AttackerStats.Performance - 400)) / (PlayerStats.Kills + PlayerStats.Deaths), 'Performance')
      //this.Server.DB.editStat(Attacker.ClientId, (AttackerStats.TotalPerformance + (PlayerStats.Performance + 400)) / (AttackerStats.Kills + AttackerStats.Deaths), 'Performance')

    })

    Player.on('message', async (Message) => {
      if (Message.startsWith(config.commandPrefix)) return
      await this.Server.DB.logMessage(Player.ClientId, Player.Name, Player.Server.HostnameRaw, Message)
    })
  }
  async updateStats() {
    Object.entries(this.Buffer.Stats).forEach(async Stats => {
      if (!this.Buffer.previousStats[Stats[0]] || (Stats[1].Kills <= this.Buffer.previousStats[Stats[0]].Kills && Stats[1].Deaths <= this.Buffer.previousStats[Stats[0]].Deaths)) return
      
      this.Server.DB.editStats(Stats[0], Stats[1])

      this.Buffer.previousStats[Stats[0]] = {}
      Object.assign(this.Buffer.previousStats[Stats[0]], Stats[1])
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
        if (!Client || !Client.ClientId) return
        this.Server.DB.incrementStat(Client.ClientId, (new Date() - Client.lastSeen) / 1000 / 60, 'PlayedTime')
        Client.lastSeen = new Date()
        var Stats = this.Buffer.Stats[Client.ClientId] ? this.Buffer.Stats[Client.ClientId] : await this.Server.DB.getPlayerStatsTotal(Client.ClientId)
        this.Server.DB.addStatRecord(Client.ClientId, Stats.TotalPerformance, Math.max(0, Stats.Performance))
      })
    }, 60000)
  }
}

module.exports = Plugin