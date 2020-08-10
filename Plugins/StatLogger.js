const path = require('path');

var plugin = {
    Server: null,
    playerConnected: async (Player) => {
      Player.on("kill", async (Victim, Attack) => {
        
        plugin.Server.DB.getMostUsedWeapon(Player.ClientId)

        await plugin.Server.DB.logKill(Player.ClientId, Victim.ClientId, Attack)

        plugin.Server.DB.incrementStat(Player.ClientId, 1, 'Kills')

        var PlayerStats = await plugin.Server.DB.getPlayerStatsTotal(Player.ClientId)
        plugin.Server.DB.editStat(Player.ClientId, plugin.calculatePerformance(PlayerStats.Kills, PlayerStats.Deaths, PlayerStats.PlayedTime), 'Performance')
      })
      Player.on('death', async (Attacker, Attack) => {

        plugin.Server.DB.incrementStat(Player.ClientId, 1, 'Deaths')

        var PlayerStats = await plugin.Server.DB.getPlayerStatsTotal(Player.ClientId)
        plugin.Server.DB.editStat(Player.ClientId, plugin.calculatePerformance(PlayerStats.Kills, PlayerStats.Deaths, PlayerStats.PlayedTime), 'Performance')
      })
      Player.on('message', async (Message) => {
        await plugin.Server.DB.logMessage(Player.ClientId, Message)
      })
      plugin.Server.DB.getClientLevel(Player.ClientId) ==  -1 && Player.Kick(`You are banned from this server`, 1)
    },
    calculatePerformance(k, d, t) {
      //  (kdr / playedtime) * 100
      return ( ( Math.max(k, 1) / Math.max(d, 1) ) / ( Math.max(t, 1) / 10 ) ) * 100
    },
    init: function() {
        this.Server.on('connect', this.playerConnected)
        this.playedTimeLogger()
    },
    playedTimeLogger() {
      setInterval(async () => {
        var status = await plugin.Server.Rcon.getStatus()
        status.data.clients.forEach(async client => {
          var ClientId = await plugin.Server.DB.getClientId(client.guid)
          plugin.Server.DB.incrementStat(ClientId, 1, 'PlayedTime')
        })
      }, 60000)
    },
    onLoad: function(Server) {
      this.Server = Server
      this.init()
    }
}
module.exports = plugin